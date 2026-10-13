import { ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, LoaderCircleIcon } from "lucide-react";
import { type ReactElement, type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MentionResolutionProvider } from "@/components/MemoContent/MentionResolutionContext";
import { Button } from "@/components/ui/button";
import { useAppSidebar } from "@/contexts/AppSidebarContext";
import { useAuth } from "@/contexts/AuthContext";
import { isSearchFilter, useMemoFilterContext } from "@/contexts/MemoFilterContext";
import { useNewMemo } from "@/contexts/NewMemoContext";
import { useSpaceContext } from "@/contexts/SpaceContext";
import { useView } from "@/contexts/ViewContext";
import { useDateFilterNavigation } from "@/hooks/useDateFilterNavigation";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { useFilteredMemoStats } from "@/hooks/useFilteredMemoStats";
import { useInfiniteMemos } from "@/hooks/useMemoQueries";
import { hoistMemoToFront } from "@/hooks/useMemoSorting";
import { findAdjacentEntryDate, getToday, parseLocalDate } from "@/lib/calendar-utils";
import { combineCELFilters } from "@/lib/cel-filter";
import { DEFAULT_LIST_MEMOS_PAGE_SIZE, LOADING_INDICATOR_DELAY_MS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { State } from "@/types/proto/api/common_pb";
import type { Memo } from "@/types/proto/api/memo_service_pb";
import { useTranslate } from "@/utils/i18n";
import ColumnGrid, { ColumnGridUntrappedProvider, columnCountForWidth, GRID_GAP } from "../ColumnGrid";
import MemoFilters from "../MemoFilters";
import Placeholder from "../Placeholder";
import MemoListError from "./MemoListError";
import { estimateMemoCardHeight } from "./memoCardHeight";

// Memo identity for React keys and grid planning. The pages use it for their renderer keys too,
// so flow-list and grid identity can never drift apart. Deliberately name-only: content updates
// reconcile in place (updateTime is a protobuf Timestamp object, not usable in a template string).
export const getMemoKey = (memo: Memo) => memo.name;

// Columns never stretch past this, so 2 columns on a wide monitor stay readable and the
// grid centers in the leftover space instead of filling it.
const MAX_COLUMN_WIDTH = 420;

const Loader = () => (
  <div className="w-full flex flex-row justify-center items-center py-8">
    <LoaderCircleIcon className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

interface Props {
  renderer: (memo: Memo, options: { compact: boolean }) => ReactElement;
  listSort?: (list: Memo[]) => Memo[];
  state?: State;
  orderBy?: string;
  filter?: string;
  contextFilter?: string;
  pageSize?: number;
  showCreator?: boolean;
  enabled?: boolean;
  /** Route-owned content rendered before the list and inside column one in grid mode. */
  renderLeading?: (options: { useGrid: boolean }) => ReactNode;
  /** Route-owned content spanning the full list width above every column (e.g. a page identity block). */
  renderHeader?: (options: { useGrid: boolean }) => ReactNode;
  /** Replaces the generic empty-state message when the route knows why the list is empty. */
  emptyMessage?: string;
  /** Enables the end-of-list day controls (today / previous day / next day). Diary routes only. */
  dateNavigation?: boolean;
}

function useAutoFetchWhenNotScrollable({
  enabled,
  hasNextPage,
  isFetchingNextPage,
  memoCount,
  onFetchNext,
}: {
  enabled: boolean;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  memoCount: number;
  onFetchNext: () => Promise<unknown>;
}) {
  const autoFetchTimeoutRef = useRef<number | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const isPageScrollable = useCallback(() => {
    const documentHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    return documentHeight > window.innerHeight + 100;
  }, []);

  const checkAndFetchIfNeeded = useCallback(async () => {
    if (autoFetchTimeoutRef.current) {
      clearTimeout(autoFetchTimeoutRef.current);
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    const shouldFetch = enabledRef.current && !isPageScrollable() && hasNextPage && !isFetchingNextPage && memoCount > 0;

    if (shouldFetch) {
      await onFetchNext();

      if (enabledRef.current) {
        autoFetchTimeoutRef.current = window.setTimeout(() => {
          void checkAndFetchIfNeeded();
        }, 500);
      }
    }
  }, [enabled, hasNextPage, isFetchingNextPage, memoCount, isPageScrollable, onFetchNext]);

  useEffect(() => {
    if (enabled && !isFetchingNextPage && memoCount > 0) {
      void checkAndFetchIfNeeded();
    }
  }, [enabled, memoCount, isFetchingNextPage, checkAndFetchIfNeeded]);

  useEffect(() => {
    if (!enabled && autoFetchTimeoutRef.current) {
      clearTimeout(autoFetchTimeoutRef.current);
      autoFetchTimeoutRef.current = null;
    }
  }, [enabled]);

  useEffect(() => {
    return () => {
      if (autoFetchTimeoutRef.current) {
        clearTimeout(autoFetchTimeoutRef.current);
      }
    };
  }, []);
}

const PagedMemoList = (props: Props) => {
  const t = useTranslate();
  const { isUserSettingsInitialized } = useAuth();
  const { filters, memoView, removeFilter } = useMemoFilterContext();
  const { setQuickFindOpen } = useAppSidebar();
  const { maxColumns, compactMode } = useView();
  // maxColumns is a ceiling: 1 = single reading column, 0 = as many as fit. The single
  // column renders in normal document flow; anything wider becomes the packed grid.
  const multiColumn = maxColumns !== 1;

  // Measure the available width: when it only fits one column anyway, render the flow
  // layout rather than a degenerate one-column grid (capped tiles, composer-as-tile).
  // Only the boolean is stored, so continuous resizes re-render nothing until the
  // one-column threshold is actually crossed.
  const layoutMeasureRef = useRef<HTMLDivElement>(null);
  const [fitsGridWidth, setFitsGridWidth] = useState<boolean | undefined>(undefined);
  useLayoutEffect(() => {
    const el = layoutMeasureRef.current;
    if (!el) return;
    const apply = (nextWidth: number) => setFitsGridWidth(columnCountForWidth(nextWidth) >= 2);
    apply(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => apply(entries[0]?.contentRect.width ?? el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const useGrid = multiColumn && (fitsGridWidth ?? true);
  // Grid tiles are always bounded/compact; the narrow-width fallback behaves exactly like
  // maxColumns = 1, so it respects the user's own compact setting. Centralized here so the
  // pages don't each repeat the policy.
  const effectiveCompact = compactMode || useGrid;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, error, isFetchNextPageError, refetch } =
    useInfiniteMemos(
      {
        state: props.state || State.NORMAL,
        orderBy: props.orderBy || "create_time desc",
        filter: combineCELFilters(props.contextFilter, props.filter),
        pageSize: props.pageSize || DEFAULT_LIST_MEMOS_PAGE_SIZE,
      },
      { enabled: props.enabled ?? true },
    );

  // Tag settings decide whether sensitive memo content must be blurred. Keep that
  // privacy boundary, but do not wait for unrelated memo views or instance settings.
  const isDisplayPending = isLoading || !isUserSettingsInitialized;
  // A failed first page leaves nothing to show; a failed later page keeps what already
  // loaded. Either way, automatic pagination pauses until the user retries.
  const isInitialError = isError && !isFetchNextPageError;
  const canPaginate = !isDisplayPending && !isError;
  const showLoader = useDelayedFlag(isDisplayPending, LOADING_INDICATOR_DELAY_MS);

  // Flatten pages into a single array of memos
  const memos = useMemo(() => data?.pages.flatMap((page) => page.memos) || [], [data]);

  // Apply custom sorting if provided, otherwise use memos directly, then hoist
  // a freshly created memo to the very top so it stays visible above pins.
  const { newMemoName } = useNewMemo();
  const sortedMemoList = useMemo(() => {
    const sorted = props.listSort ? props.listSort(memos) : memos;
    return hoistMemoToFront(sorted, newMemoName);
  }, [memos, props.listSort, newMemoName]);

  // Auto-fetch hook: fetches more content when page isn't scrollable
  useAutoFetchWhenNotScrollable({
    enabled: canPaginate,
    hasNextPage,
    isFetchingNextPage,
    memoCount: sortedMemoList.length,
    onFetchNext: fetchNextPage,
  });

  // Infinite scroll: fetch more when user scrolls near bottom
  useEffect(() => {
    if (!canPaginate || !hasNextPage) return;

    const handleScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
      if (nearBottom && !isFetchingNextPage) {
        fetchNextPage();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [canPaginate, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const leadingContent = props.renderLeading?.({ useGrid });
  const headerContent = props.renderHeader?.({ useGrid });

  // A freshly created memo is hoisted to the front; pin it to the top of column one so it
  // appears right under the composer instead of dropping into a random (shortest) column.
  const displayMemoList = isDisplayPending || isInitialError ? [] : sortedMemoList;
  const firstMemo = displayMemoList[0];
  const priorityKey = newMemoName && firstMemo?.name === newMemoName ? getMemoKey(firstMemo) : undefined;

  // Stable reference so MentionResolutionProvider's memo (keyed on the array) actually holds.
  const contents = useMemo(() => displayMemoList.map((memo) => memo.content), [displayMemoList]);
  const userNames = useMemo(
    () =>
      Array.from(
        new Set(
          displayMemoList.flatMap((memo) => [
            ...(props.showCreator ? [memo.creator] : []),
            ...(memo.reactions ?? []).map((reaction) => reaction.creator),
          ]),
        ),
      ),
    [props.showCreator, displayMemoList],
  );

  const hasFilters = filters.length > 0 || memoView !== undefined;
  const emptyPlaceholder =
    !isDisplayPending && !isError && !isFetchingNextPage && !hasNextPage && displayMemoList.length === 0 ? (
      <Placeholder scene={hasFilters ? "search" : "memo"} message={props.emptyMessage ?? t("message.no-data")} className="w-full" />
    ) : null;
  const initialLoader = isDisplayPending && showLoader ? <Loader /> : null;
  // Only a query the user typed can be edited or cleared from the error; facet and scope
  // filters are fixed by the route.
  const hasSearch = filters.some(isSearchFilter);
  const errorNotice =
    !isDisplayPending && isError ? (
      <MemoListError
        error={error}
        onRetry={isFetchNextPageError ? fetchNextPage : refetch}
        onEditQuery={hasSearch ? () => setQuickFindOpen(true) : undefined}
        onClearQuery={hasSearch ? () => removeFilter(isSearchFilter) : undefined}
      />
    ) : null;
  const initialError = isInitialError ? errorNotice : null;
  const pageError = isFetchNextPageError ? errorNotice : null;

  // Column one is the action column: the composer and any active filters head it, and the
  // empty state follows them. The newest memo also lands directly beneath them (priorityKey
  // above). Every vertical seam inside the stack uses GRID_GAP so y-spacing matches the
  // grid's x-spacing exactly.
  const gridLeading =
    leadingContent || hasFilters || initialLoader || emptyPlaceholder || initialError ? (
      <div className="flex w-full flex-col" style={{ gap: GRID_GAP }}>
        {leadingContent}
        <MemoFilters />
        {initialLoader}
        {initialError}
        {emptyPlaceholder}
      </div>
    ) : undefined;

  // Pagination controls are identical across both layouts. A day-filtered list can be empty
  // and still needs the day controls, so they stay put even with nothing to show above them.
  const showListEnd = hasNextPage || displayMemoList.length > 0 || Boolean(props.dateNavigation);
  const footer = (
    <>
      {pageError}
      {isFetchingNextPage && <Loader />}
      {!isFetchingNextPage && showListEnd && (props.dateNavigation ? <DateNavigationRow /> : <BackToTop />)}
    </>
  );

  const children = (
    <MentionResolutionProvider contents={contents} userNames={userNames}>
      <div ref={layoutMeasureRef} className="w-full">
        <div className={cn("flex flex-col justify-start w-full mx-auto", useGrid ? "max-w-none" : "max-w-2xl")}>
          {useGrid ? (
            <>
              <ColumnGridUntrappedProvider>
                <ColumnGrid
                  items={displayMemoList}
                  getKey={getMemoKey}
                  renderItem={(memo) => props.renderer(memo, { compact: effectiveCompact })}
                  estimateHeight={estimateMemoCardHeight}
                  header={headerContent}
                  leading={gridLeading}
                  priorityKey={priorityKey}
                  maxColumns={maxColumns}
                  maxColumnWidth={MAX_COLUMN_WIDTH}
                />
              </ColumnGridUntrappedProvider>
              {!isDisplayPending && footer}
            </>
          ) : (
            <>
              {headerContent}
              {leadingContent}
              <MemoFilters className="mb-2" />
              {initialLoader}
              {initialError}
              {displayMemoList.map((memo) => props.renderer(memo, { compact: effectiveCompact }))}
              {emptyPlaceholder}
              {!isDisplayPending && footer}
            </>
          )}
        </div>
      </div>
    </MentionResolutionProvider>
  );

  return children;
};

/** The single row that closes the list, in both layouts. Buttons wrap rather than overflow. */
const ListEndRow = ({ children }: { children: ReactNode }) => (
  <div className="my-4 flex w-full flex-row flex-wrap items-center justify-center gap-1 opacity-70">{children}</div>
);

/** "Back to top" is a scroll-triggered affordance, so its visibility is read where the row is built. */
const useBackToTopVisible = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const shouldShow = window.scrollY > 400;
      setIsVisible(shouldShow);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return isVisible;
};

const BackToTopButton = () => {
  const t = useTranslate();

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <Button variant="ghost" onClick={scrollToTop}>
      {t("router.back-to-top")}
      <ArrowUpIcon className="ml-1 w-4 h-auto" />
    </Button>
  );
};

/** Pages without day controls: nothing renders while hidden, so the list's end carries no phantom spacing. */
const BackToTop = () => {
  const isVisible = useBackToTopVisible();

  if (!isVisible) {
    return null;
  }

  return (
    <ListEndRow>
      <BackToTopButton />
    </ListEndRow>
  );
};

/**
 * The diary page's end-of-list row. The day buttons are permanent, so an empty day still offers
 * a way out; only "back to top" comes and goes with the scroll position, and the row's height is
 * set by the buttons that remain, so the list's end never jumps.
 */
const DateNavigationRow = () => {
  const isBackToTopVisible = useBackToTopVisible();

  return (
    <ListEndRow>
      <DateNavigation showBackToTop={isBackToTopVisible} />
    </ListEndRow>
  );
};

/**
 * One day per click, at the end of the list: today, then the nearest neighbouring day that
 * actually holds an entry. The anchor is the `displayTime` day being filtered, falling back to
 * today when no day filter is active, so the jumps continue from wherever the reader is.
 * Entry days come from the same Home-scoped statistics the sidebar calendar draws, so the two
 * share one request and agree on which days exist.
 */
const DateNavigation = ({ showBackToTop }: { showBackToTop: boolean }) => {
  const t = useTranslate();
  const { filters } = useMemoFilterContext();
  const { memoFilter } = useSpaceContext();
  const navigateToDateFilter = useDateFilterNavigation();
  const { statistics } = useFilteredMemoStats({ context: "collection", filter: memoFilter });
  const today = getToday();
  const selectedDay = filters.find((filter) => filter.factor === "displayTime")?.value;
  const anchorDate = selectedDay && parseLocalDate(selectedDay) ? selectedDay : today;
  const previousDate = findAdjacentEntryDate(anchorDate, statistics.activityStats, -1);
  const nextDate = findAdjacentEntryDate(anchorDate, statistics.activityStats, 1);

  // A new day is a new page: land at its top instead of at the end of the previous one.
  const jumpToDate = (date: string) => {
    navigateToDateFilter(date);
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <Button variant="ghost" onClick={() => jumpToDate(today)}>
        {t("calendar.back-to-today")}
      </Button>
      <Button variant="ghost" disabled={!previousDate} onClick={() => previousDate && jumpToDate(previousDate)}>
        <ArrowLeftIcon className="mr-1 w-4 h-auto" />
        {t("calendar.previous-day")}
      </Button>
      {showBackToTop && <BackToTopButton />}
      <Button variant="ghost" disabled={!nextDate} onClick={() => nextDate && jumpToDate(nextDate)}>
        {t("calendar.next-day")}
        <ArrowRightIcon className="ml-1 w-4 h-auto" />
      </Button>
    </>
  );
};

export default PagedMemoList;
