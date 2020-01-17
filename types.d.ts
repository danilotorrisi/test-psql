interface Message<Type = "", Data = {}, Metadata = {}> {
  id: string;
  stream_name: string;
  type: Type;
  position: number;
  global_position: number;
  data: Data;
  metadata: Metadata;
  time: Date;
}
