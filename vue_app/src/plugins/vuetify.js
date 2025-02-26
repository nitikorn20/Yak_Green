// 📌 src/plugins/vuetify.js
import { createVuetify } from "vuetify";
import "vuetify/styles";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

// ✅ Import Material Design Icons (MDI)
import "@mdi/font/css/materialdesignicons.css";

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
      size: 16, // ✅ ขนาดเริ่มต้น
    },
  },
});

export default vuetify;
