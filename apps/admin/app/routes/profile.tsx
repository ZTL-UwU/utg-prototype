import { useQuery } from '@tanstack/react-query';

import { api } from '~/lib/api';

export default function Profile() {
  const { data: user } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: () => api('/user/profile'),
  });

  return (
    <div>
      <h1>Profile</h1>
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </div>
  );
}
