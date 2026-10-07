import Calendar from "./calendar";
import data from "../data/tournament.json";
export default function Page() {
  return <Calendar tournament={data} />;
}
