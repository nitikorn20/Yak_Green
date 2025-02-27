import "./assets/main.css";
import "./assets/tailwind.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { createVuetify } from "vuetify";
import "vuetify/styles";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
//import "@/utils/log"; // ✅ ปิด log ใน Production

// ✅ Import Material Design Icons (MDI)
import "@mdi/font/css/materialdesignicons.css";

// ✅ Import FontAwesome
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

// ✅ ตั้งค่า Vuetify
const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: "mdi",
  },
  defaults: {
    global: {
      font: "Roboto, sans-serif",
    },
  },
});

// ✅ สร้าง Vue App
const app = createApp(App);

// ✅ ใช้ Plugins ต่างๆ
app.use(createPinia());
app.use(router);
app.use(vuetify);

// ✅ ลงทะเบียนเฉพาะ FontAwesome เป็น Global Component
app.component("font-awesome-icon", FontAwesomeIcon);

// 🚀 Mount Vue App
app.mount("#app");
