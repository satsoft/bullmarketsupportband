/**
 * Thin X/Twitter posting wrapper (OAuth 1.0a user context, twitter-api-v2).
 * Media upload is best-effort: if it fails (e.g. free-tier v1.1 restrictions),
 * we post text-only rather than failing the tweet.
 */
import { TwitterApi } from 'twitter-api-v2';

export class SocialPoster {
  private client: TwitterApi;

  constructor() {
    this.client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_SECRET!,
    });
  }

  /** Retry transient X failures (rate limit / 5xx) so a momentary outage doesn't drop a post. */
  private async withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
    const transient = new Set([429, 500, 502, 503, 504]);
    let lastErr: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
        const code = (e as { code?: number }).code;
        if (!code || !transient.has(code) || attempt === 3) throw e;
        const wait = attempt * 3000;
        console.warn(`[poster] ${label} transient ${code} — retry ${attempt}/2 in ${wait}ms`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    throw lastErr;
  }

  private async upload(buf: Buffer): Promise<string | undefined> {
    try {
      return await this.withRetry(() => this.client.v1.uploadMedia(buf, { mimeType: 'image/png' }), 'upload');
    } catch (e) {
      console.warn('[poster] media upload failed → text-only:', (e as Error).message);
      return undefined;
    }
  }

  /** Post a main tweet (with optional image). Returns the tweet id. */
  async tweet(text: string, mediaBuffer?: Buffer | null): Promise<string> {
    let mediaId: string | undefined;
    if (mediaBuffer) mediaId = await this.upload(mediaBuffer);
    const res = await this.withRetry(
      () => this.client.v2.tweet({ text, ...(mediaId && { media: { media_ids: [mediaId] } }) }),
      'tweet',
    );
    return res.data.id;
  }

  /** Reply to a tweet (used for the optional link self-reply). */
  async reply(text: string, inReplyToTweetId: string): Promise<string> {
    const res = await this.withRetry(
      () => this.client.v2.tweet({ text, reply: { in_reply_to_tweet_id: inReplyToTweetId } }),
      'reply',
    );
    return res.data.id;
  }
}
