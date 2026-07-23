import { useQuery } from '@tanstack/react-query';

import { api } from '~/lib/api';
import { pageTitle } from '~/lib/page-title';

export default function Profile() {
  const { data: user } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: () => api('/user/profile'),
  });

  return (
    <div>
      <title>{pageTitle('Profile')}</title>
      <h1>Profile</h1>
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </div>
  );
}
