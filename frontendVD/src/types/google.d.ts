// Type declarations for Google Sign-In (GSI) library loaded from
// https://accounts.google.com/gsi/client
// Ref: https://developers.google.com/identity/gsi/web/reference/js-reference

interface PromptMomentNotification {
  isDisplayMoment(): boolean;
  isDisplayed(): boolean;
  isNotDisplayed(): boolean;
  getNotDisplayedReason(): string;
  isSkippedMoment(): boolean;
  getSkippedReason(): string;
  isDismissedMoment(): boolean;
  getDismissedReason(): string;
  getMomentType(): string;
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential: string; select_by?: string }) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    itp_support?: boolean;
    use_fedcm_for_button?: boolean;
    login_uri?: string;
    ux_mode?: 'popup' | 'redirect';
    context?: 'signin' | 'signup' | 'use';
    nonce?: string;
    state_cookie_domain?: string;
    prompt_parent_id?: string;
    login_hint?: string;
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
      locale?: string;
      click_listener?: () => void;
      state?: string;
    },
  ) => void;
  prompt: (momentListener?: (notification: PromptMomentNotification) => void) => void;
  disableAutoSelect: () => void;
  cancel: () => void;
  revoke: (login_hint: string, callback?: (response: { successful: boolean; error?: string }) => void) => void;
}

interface Google {
  accounts: {
    id: GoogleAccountsId;
  };
}

interface Window {
  google?: Google;
}
