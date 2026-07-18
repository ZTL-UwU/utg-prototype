import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { FetchError } from 'ofetch';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import { api } from '~/lib/api';
import { safeRedirect } from '~/lib/redirect';
import { cn } from '~/lib/utils';
import { useAuthStore, type AuthUser } from '~/stores/auth';

const loginSchema = z.object({
  email: z.string().min(1, 'Enter your email.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { mutateAsync: login } = useMutation({
    mutationFn: async (values: LoginValues) => {
      const tokens = await api<{
        access: string;
        refresh: string;
        user: AuthUser;
      }>('/user/login', {
        method: 'POST',
        body: values,
      });
      return tokens;
    },
    onSuccess: (data) => {
      setAuth(data.access, data.refresh, data.user);
      toast.success('Login successful');
      void navigate(safeRedirect(searchParams.get('redirect')), { replace: true });
    },
    onError: (error) => {
      toast.error('Login failed', {
        description: error instanceof FetchError ? error.data.detail : error.message,
      });
    },
  });

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: async (values) => {
      await login(values.value);
    },
  });

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <div className="select-none">
        <h1 className="text-3xl text-center font-extrabold">Sozler Saylisi</h1>
        <h2 className="text-lg text-center text-muted-foreground">Admin Content Portal</h2>
      </div>
      <Card>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void form.handleSubmit();
            }}
          >
            <FieldGroup>
              <form.Field
                name="email"
                children={(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="email"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="Enter your email"
                        autoComplete="email"
                        required
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              />
              <form.Field
                name="password"
                children={(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="password"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        required
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              />
              <Field>
                <form.Subscribe
                  selector={(state) => state.isSubmitting}
                  children={(isSubmitting) => (
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Signing In…' : 'Sign In'}
                    </Button>
                  )}
                />
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
