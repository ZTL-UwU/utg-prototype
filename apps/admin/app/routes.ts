import { type RouteConfig, index, layout, route } from '@react-router/dev/routes';

export default [
  route('login', 'routes/login.tsx'),
  layout('routes/app-layout.tsx', [
    index('routes/home.tsx'),
    route('autoform', 'routes/autoform.tsx'),
    route('sortable', 'routes/sortable.tsx'),
    route('profile', 'routes/profile.tsx'),
    route(':layer', 'routes/layer.tsx'),
    route(':layer/:unitId', 'routes/unit.tsx'),
  ]),
] satisfies RouteConfig;
