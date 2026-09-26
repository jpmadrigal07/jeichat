// Navigation API isn't in TypeScript's DOM lib yet.
type NavigationHistory = {
  canGoBack: boolean;
  currentEntry: { index: number } | null;
  entries(): { url: string | null }[];
};

function getNavigation() {
  return (window as Window & { navigation?: NavigationHistory }).navigation;
}

/**
 * The Navigation API only lists same-origin entries, so this is false when
 * the page was opened directly (deep link, push notification, new tab).
 * `history.length` can't tell those apart from in-app history.
 */
export function canGoBackInApp() {
  return getNavigation()?.canGoBack === true;
}

/** Whether the previous history entry is `href` (path + query, hash ignored). */
export function isPreviousEntry(href: string) {
  const navigation = getNavigation();
  const index = navigation?.currentEntry?.index ?? 0;
  const previousUrl =
    navigation && index > 0 ? navigation.entries()[index - 1]?.url : null;
  if (!previousUrl) return false;

  const previous = new URL(previousUrl);
  const target = new URL(href, window.location.origin);
  return (
    previous.pathname === target.pathname &&
    previous.searchParams.toString() === target.searchParams.toString()
  );
}
