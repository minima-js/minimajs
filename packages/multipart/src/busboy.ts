import type { MultipartOptions } from "./types.js";
import { Busboy, type BusboyHeaders } from "@fastify/busboy";
import { UploadError } from "./errors.js";
import { abort, context } from "@minimajs/server";
import { Readable } from "node:stream";

function toBusBoyHeaders(headers: Headers): BusboyHeaders {
  return {
    "content-type": headers.get("content-type")!,
  };
}

export function busboy(opt: MultipartOptions) {
  const { request, incomingMessage } = context<any>();
  let bb: Busboy;
  let stream: Readable | undefined = incomingMessage;
  if (!stream) {
    if (!request.body) {
      throw new UploadError("Missing request body", 400);
    }
    stream = Readable.fromWeb(request.body);
  }

  function stop() {
    stream!.unpipe(bb);
    bb.destroy();
    // console.log("voding!!!");
    // stream?.pipe(stream2void());
    stream!.resume();
  }

  try {
    const headers = toBusBoyHeaders(request.headers);
    bb = new Busboy({
      ...opt,
      headers,
    });

    stream.pipe(bb);

    return [bb, stop] as const;
  } catch (err) {
    if (abort.is(err)) throw err;
    if (err instanceof Error) {
      throw new UploadError(err.message, 400, { base: err });
    }
    throw err;
  }
}
