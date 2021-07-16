import { help_navigate } from "../beta/commands/help";
import CrownBot from "../handlers/CrownBot";
export default async (client: CrownBot, menu: any) => {
  switch (menu.id) {
    case "help_menu" + client.buttons_version:
      help_navigate(client, menu);
      break;
  }
};
