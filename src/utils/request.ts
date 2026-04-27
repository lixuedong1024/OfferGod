export interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
  responseType?: 'json' | 'text' | 'blob';
  isBackground?: boolean;
}

export type OnStream = (reader: ReadableStreamDefaultReader) => Promise<void>;

export const request = {
  async post(options: RequestOptions & { onStream?: OnStream }): Promise<any> {
    const {
      url,
      data,
      headers = {},
      timeout = 30000,
      responseType = 'json',
      onStream,
    } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: data,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (onStream && response.body) {
        const reader = response.body.getReader();
        await onStream(reader);
        return {};
      }

      if (responseType === 'json') {
        return await response.json();
      } else if (responseType === 'text') {
        return await response.text();
      } else {
        return await response.blob();
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw new Error(`Request failed: ${error.message}`);
    }
  },

  async get(options: RequestOptions): Promise<any> {
    return this.post({ ...options, method: 'GET' });
  },
};
