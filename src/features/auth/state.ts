export type LoginState = {
  email: string;
  error?: string;
  fieldErrors?: { email?: string; password?: string };
};

export type LogoutState = { error?: string };
