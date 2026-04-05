// Type declarations for Google Sign-In (GSI) library loaded from
// https://accounts.google.com/gsi/client

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential: string; select_by?: string }) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (
    element: HTMLElement,
    options: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      width?: number;
      logo_alignment?: 'left' | 'center';
    },
  ) => void;
  prompt: () => void;
  disableAutoSelect: () => void;
}

interface Google {
  accounts: {
    id: GoogleAccountsId;
  };
}

interface Window {
  google?: Google;
}
