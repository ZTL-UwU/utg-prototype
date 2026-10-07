/** Credentials from the `/reset-password?uid=…&token=…` link the backend emails. */
export type PasswordResetParams = {
  uid: string;
  token: string;
};
