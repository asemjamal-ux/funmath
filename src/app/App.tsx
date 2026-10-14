import { lazy, Suspense, type ComponentType } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { LocaleLayout } from './LocaleLayout';
import { RootRedirect, SetupPage, WelcomePage } from '../pages/Welcome';
import { AboutPage, NotFoundPage } from '../pages/Misc';

// Route-level code splitting (ARCH §6.3): learner screens and the Grown-ups Area load on demand.
function page<M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M) {
  const C = lazy(async () => ({ default: (await load())[name] as ComponentType }));
  return (
    <Suspense fallback={<div className="boot" aria-busy="true" />}>
      <C />
    </Suspense>
  );
}
const learner = () => import('../pages/Learner');
const grown = () => import('../pages/GrownUps');
const worksheets = () => import('../features/worksheets/WorksheetsPage');

/**
 * Starts downloading the route chunk for the URL being opened in parallel with storage init and the
 * locale catalogue, instead of after them (NFR-01: removes a network round trip before first paint).
 */
export function preloadRoute(pathname: string): void {
  const rest = pathname.replace(/^\/(en|ar)(?=\/|$)/, '');
  if (rest.startsWith('/grown-ups')) void grown();
  else if (/^\/(home|world|skill|lesson|practice|daily-mix|games|trophies|progress)(\/|$)/.test(rest)) void learner();
}

// ARCH §2 site map. URL slugs are English in both locales; profile ids appear only in the Grown-ups Area.
const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  { path: '/about', element: <RootRedirect /> },
  {
    path: '/:locale',
    element: <LocaleLayout />,
    children: [
      { index: true, element: <WelcomePage /> },
      { path: 'setup', element: <SetupPage /> },
      { path: 'about', element: <AboutPage /> },
      // Worksheets are for learners and grown-ups alike, so they don't require an active profile.
      { path: 'worksheets', element: page(worksheets, 'WorksheetsPage') },
      {
        element: page(learner, 'RequireProfile'),
        children: [
          { path: 'home', element: page(learner, 'HomePage') },
          { path: 'world/:operation', element: page(learner, 'WorldPage') },
          { path: 'skill/:skillId', element: page(learner, 'SkillPage') },
          { path: 'lesson/:skillId', element: page(learner, 'LessonPage') },
          { path: 'practice/:skillId', element: page(learner, 'PracticePage') },
          { path: 'daily-mix', element: page(learner, 'DailyMixPage') },
          { path: 'games', element: page(learner, 'GamesHubPage') },
          { path: 'games/:gameId', element: page(learner, 'GamePage') },
          { path: 'trophies', element: page(learner, 'TrophyRoomPage') },
          { path: 'progress', element: page(learner, 'ProgressPage') },
        ],
      },
      {
        path: 'grown-ups',
        element: page(grown, 'GrownUpsLayout'),
        children: [
          { index: true, element: page(grown, 'GrownUpsHome') },
          { path: 'report/:profileId', element: page(grown, 'ReportPage') },
          { path: 'profiles', element: page(grown, 'ProfilesPage') },
          { path: 'settings', element: page(grown, 'SettingsPage') },
          { path: 'data', element: page(grown, 'DataPage') },
          { path: 'privacy', element: page(grown, 'PrivacyPage') },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
