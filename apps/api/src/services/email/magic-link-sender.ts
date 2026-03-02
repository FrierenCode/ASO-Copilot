export interface MagicLinkSenderParams {
  toEmail: string
  magicLink: string
  expiresAt: string
}

export interface MagicLinkSender {
  send(params: MagicLinkSenderParams): Promise<void>
}

/**
 * Console-based sender for local development.
 * TODO: replace with a real email provider (Resend, SendGrid, etc.)
 */
export class ConsoleMagicLinkSender implements MagicLinkSender {
  async send(params: MagicLinkSenderParams): Promise<void> {
    console.log('[MagicLink] ────────────────────────────────────────')
    console.log('[MagicLink] To     :', params.toEmail)
    console.log('[MagicLink] Link   :', params.magicLink)
    console.log('[MagicLink] Expires:', params.expiresAt)
    console.log('[MagicLink] ────────────────────────────────────────')
  }
}
