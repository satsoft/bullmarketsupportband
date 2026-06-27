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

  private async upload(buf: Buffer): Promise<string | undefined> {
    try {
      return await this.client.v1.uploadMedia(buf, { mimeType: 'image/png' });
    } catch (e) {
      console.warn('[poster] media upload failed → text-only:', (e as Error).message);
      return undefined;
    }
  }

  /** Post a main tweet (with optional image). Returns the tweet id. */
  async tweet(text: string, mediaBuffer?: Buffer | null): Promise<string> {
    let mediaId: string | undefined;
    if (mediaBuffer) mediaId = await this.upload(mediaBuffer);
    const res = await this.client.v2.tweet({
      text,
      ...(mediaId && { media: { media_ids: [mediaId] } }),
    });
    return res.data.id;
  }

  /** Reply to a tweet (used for the optional link self-reply). */
  async reply(text: string, inReplyToTweetId: string): Promise<string> {
    const res = await this.client.v2.tweet({
      text,
      reply: { in_reply_to_tweet_id: inReplyToTweetId },
    });
    return res.data.id;
  }
}
