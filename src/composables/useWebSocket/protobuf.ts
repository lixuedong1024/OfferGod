import protobuf from 'protobufjs';

export interface TechwolfUser {
  uid: string;
  name?: string;
  avatar?: string;
  source?: number;
}

export interface TechwolfImageInfo {
  url: string;
  width: number;
  height: number;
}

export interface TechwolfImage {
  iid?: number;
  tinyImage?: TechwolfImageInfo;
  originImage?: TechwolfImageInfo;
}

export interface TechwolfMessageBody {
  type: number;
  templateId: number;
  headTitle?: string;
  text?: string;
  image?: TechwolfImage;
}

export interface TechwolfMessage {
  from: TechwolfUser;
  to: TechwolfUser;
  type?: number;
  mid?: string;
  time?: string;
  body: TechwolfMessageBody;
  cmid?: string;
}

export interface TechwolfMessageRead {
  userId: string;
  messageId: string;
  readTime: number;
  sync?: boolean;
  userSource?: number;
}

export interface TechwolfChatProtocol {
  type: number;
  messages?: TechwolfMessage[];
  messageRead?: TechwolfMessageRead[];
}

const Root = protobuf.Root;
const Type = protobuf.Type;
const Field = protobuf.Field;

const root = new Root()
  .define('cn.techwolf.boss.chat')
  .add(
    new Type('TechwolfUser')
      .add(new Field('uid', 1, 'int64'))
      .add(new Field('name', 2, 'string', 'optional'))
      .add(new Field('avatar', 3, 'string', 'optional'))
      .add(new Field('source', 7, 'int32', 'optional')),
  )
  .add(
    new Type('TechwolfImageInfo')
      .add(new Field('url', 1, 'string'))
      .add(new Field('width', 2, 'int32'))
      .add(new Field('height', 3, 'int32')),
  )
  .add(
    new Type('TechwolfImage')
      .add(new Field('iid', 1, 'int64', 'optional'))
      .add(new Field('tinyImage', 2, 'TechwolfImageInfo', 'optional'))
      .add(new Field('originImage', 3, 'TechwolfImageInfo', 'optional')),
  )
  .add(
    new Type('TechwolfMessageBody')
      .add(new Field('type', 1, 'int32'))
      .add(new Field('templateId', 2, 'int32'))
      .add(new Field('headTitle', 11, 'string', 'optional'))
      .add(new Field('text', 3, 'string', 'optional'))
      .add(new Field('image', 5, 'TechwolfImage', 'optional')),
  )
  .add(
    new Type('TechwolfMessage')
      .add(new Field('from', 1, 'TechwolfUser'))
      .add(new Field('to', 2, 'TechwolfUser'))
      .add(new Field('type', 3, 'int32', 'optional'))
      .add(new Field('mid', 4, 'int64', 'optional'))
      .add(new Field('time', 5, 'int64', 'optional'))
      .add(new Field('body', 6, 'TechwolfMessageBody'))
      .add(new Field('cmid', 11, 'int64', 'optional')),
  )
  .add(
    new Type('TechwolfMessageRead')
      .add(new Field('userId', 1, 'int64'))
      .add(new Field('messageId', 2, 'int64'))
      .add(new Field('readTime', 3, 'int64'))
      .add(new Field('sync', 4, 'bool', 'optional'))
      .add(new Field('userSource', 5, 'int32', 'optional')),
  )
  .add(
    new Type('TechwolfChatProtocol')
      .add(new Field('type', 1, 'int32'))
      .add(new Field('messages', 3, 'TechwolfMessage', 'repeated'))
      .add(new Field('messageRead', 8, 'TechwolfMessageRead', 'repeated')),
  );

export const ChatProtobufType = root.lookupType('TechwolfChatProtocol');

export interface MessageArgs {
  fromUid: string;
  toUid: string;
  toName: string;
  content?: string;
  image?: string;
}

export interface MessageReadArgs {
  userId: string;
  messageId: string;
  userSource?: number;
}

export class ChatMessage {
  msg: Uint8Array;
  hex: string;
  args: MessageArgs;

  constructor(args: MessageArgs) {
    this.args = args;
    const timestamp = Date.now();
    const messageId = timestamp + 68256432452609;

    const data: TechwolfChatProtocol = {
      messages: [
        {
          from: {
            uid: args.fromUid,
            source: 0,
          },
          to: {
            uid: args.toUid,
            name: args.toName,
            source: 0,
          },
          type: 1,
          mid: messageId.toString(),
          time: timestamp.toString(),
          body: {
            type: 1,
            templateId: 1,
            text: args.content,
          },
          cmid: messageId.toString(),
        },
      ],
      type: 1,
    };

    this.msg = ChatProtobufType.encode(data).finish().slice();
    this.hex = [...this.msg].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  toArrayBuffer(): ArrayBuffer {
    return this.msg.buffer.slice(0, this.msg.byteLength) as ArrayBuffer;
  }
}

export class MessageReadMessage {
  msg: Uint8Array;
  hex: string;
  args: MessageReadArgs;

  constructor(args: MessageReadArgs) {
    this.args = args;
    const readTime = Date.now();

    const data: TechwolfChatProtocol = {
      type: 6, // 已读消息类型
      messageRead: [
        {
          userId: args.userId,
          messageId: args.messageId,
          readTime,
          sync: false,
          userSource: args.userSource || 0,
        },
      ],
    };

    this.msg = ChatProtobufType.encode(data).finish().slice();
    this.hex = [...this.msg].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  toArrayBuffer(): ArrayBuffer {
    return this.msg.buffer.slice(0, this.msg.byteLength) as ArrayBuffer;
  }
}

export function decodeMessage(buffer: ArrayBuffer): TechwolfChatProtocol | null {
  try {
    const uint8Array = new Uint8Array(buffer);
    const decoded = ChatProtobufType.decode(uint8Array) as any;
    return ChatProtobufType.toObject(decoded, {
      longs: String,
      enums: String,
      bytes: String,
    }) as TechwolfChatProtocol;
  } catch (error) {
    console.error('解码消息失败', error);
    return null;
  }
}
