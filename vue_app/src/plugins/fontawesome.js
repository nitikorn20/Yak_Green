// 📌 src/plugins/fontawesome.js
import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
  faTachometerAlt,
  faTint,
  faMicrochip,
  faPaperPlane,
  faUserCog,
  faSignOutAlt,
  faBars,
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

// ✅ เพิ่มไอคอนเข้า Library
library.add(
  faTachometerAlt,
  faTint,
  faMicrochip,
  faPaperPlane,
  faUserCog,
  faSignOutAlt,
  faBars,
  faChevronLeft,
  faChevronRight
);

export default FontAwesomeIcon;
