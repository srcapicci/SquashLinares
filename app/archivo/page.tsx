import Calendar from "../calendar";
import data from "../../data/tournament.json";
export default function Archive() {
  return <Calendar tournament={data} />;
}
