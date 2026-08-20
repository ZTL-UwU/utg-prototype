import { type RouteConfig, index, layout, route } from '@react-router/dev/routes';

export default [
  route('login', 'routes/login.tsx'),
  layout('routes/app-layout.tsx', [
    index('routes/home.tsx'),
    route('words', 'routes/words.tsx'),
    route('sentences', 'routes/sentences.tsx'),
    route('mascots', 'routes/mascots.tsx'),
    route('rewards', 'routes/rewards.tsx'),
    route('users', 'routes/users.tsx'),
    route(':layer', 'routes/layer.tsx'),
    route(':layer/new', 'routes/unit-new.tsx'),
    route(':layer/:unitId', 'routes/unit.tsx'),
  ]),
] satisfies RouteConfig;
