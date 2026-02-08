import Home from "./pages/Home";
import Login from "./pages/Login";
import Subscriptions from "./pages/Subscriptions";
import EpisodeDetail from "./pages/EpisodeDetail";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

export const routers = [
    {
      path: "/",
      name: 'home',
      element: <Home />,
    },
    {
      path: "/login",
      name: 'login',
      element: <Login />,
    },
    {
      path: "/subscriptions",
      name: 'subscriptions',
      element: <Subscriptions />,
    },
    {
      path: "/episode/:id",
      name: 'episode-detail',
      element: <EpisodeDetail />,
    },
    {
      path: "/settings",
      name: 'settings',
      element: <Settings />,
    },
    /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
    {
      path: "*",
      name: '404',
      element: <NotFound />,
    },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;
