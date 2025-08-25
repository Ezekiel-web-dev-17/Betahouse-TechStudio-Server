import { model, Schema } from "mongoose";

const popularSchema = new Schema({
  title: {
    type: String,
  },
  price: {
    type: String,
  },
  image: {
    type: String,
  },
});

const Popular = model("Popular", popularSchema);

export default Popular;
