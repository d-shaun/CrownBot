import CrownBot from "../handlers/CrownBot";
import { help_navigate } from "../stable/commands/help";
export default async (client: CrownBot, menu: any) => {
  switch (menu.id) {
    case "help_menu" + client.buttons_version:
      help_navigate(client, menu);
      break;
  }
};
