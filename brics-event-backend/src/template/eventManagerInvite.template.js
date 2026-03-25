import { capitalizeName } from "../config/capitalizeName.js";

export const eventManagerInviteTemplate = ({
  name,
  eventName,
  start,
  end,
  venue,
}) => {
  const logo = process.env.BRICS_LOGO_URL;
  const portalUrl = `${process.env.FRONTEND_URL}/login`;

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;">
          <tr>
            <td style="padding:40px; text-align:left;">

              <img src="${logo}" width="180" style="display:block;margin:0 auto 30px;" alt="BRICS 2026"/>

              <p style="font-size:16px;color:#222;margin:0 0 18px;">
                Dear ${capitalizeName(name)},
              </p>

              <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">
                You have been appointed as the Event Manager for 
                <strong>${capitalizeName(eventName)}</strong>, scheduled at <strong>${venue}</strong>, from 
                <strong>${start}</strong> to <strong>${end}</strong>.
              </p>

              <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 24px;">
                As the Event Manager, you are responsible for overseeing event coordination, participant management, and operational execution within the platform.
              </p>

              <div style="text-align:center;margin:28px 0 20px;">
                <a
                  href="${portalUrl}"
                  style="
                    background:#f37021;
                    color:#ffffff;
                    padding:14px 38px;
                    border-radius:6px;
                    text-decoration:none;
                    font-size:15px;
                    font-weight:600;
                    display:inline-block;
                  "
                >
                 Accreditation Portal Link
                </a>
              </div>

              <p style="font-size:14px;color:#555;margin:0 0 6px;">
                Kindly access the portal to view and manage the assigned event.
              </p>

              <p style="font-size:14px;color:#bbb;margin-top:24px;">
                Regards,<br/>
                Team BRICS INDIA
              </p>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};
