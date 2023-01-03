import { notification } from "antd";
import { InfoCircleFilled, CloseCircleFilled, CheckCircleFilled } from "@ant-design/icons";

/*/Notification pop-up/*/
export const popupNotification = (message, status = "error") => {
  let icon;
  switch (status) {
    case "error":
      icon = (
        <CloseCircleFilled
          style={{
            color: "#ff0000"
          }}
        />
      );
      break;
    case "validation":
      icon = (
        <CheckCircleFilled
          style={{
            color: "#00ba1f"
          }}
        />
      );
      break;
    case "info":
      icon = (
        <InfoCircleFilled
          style={{
            color: "#00a2ff"
          }}
        />
      );
      break;
    default:
      icon = (
        <InfoCircleFilled
          style={{
            color: "#00a2ff"
          }}
        />
      );
  }
  notification.open({
    message: message,
    icon: icon
  });
};
