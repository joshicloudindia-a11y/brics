import { capitalizeName } from "../config/capitalizeName.js";

export const speakerInviteTemplate = ({
  name,
  eventName,
  sessionName,
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
                Team BRICS INDIA is pleased to invite you to participate as a Speaker in the <strong>${sessionName || 'assigned'}</strong> session convened as part of the <strong>${capitalizeName(eventName)}</strong>, scheduled to be held on <strong>${start}</strong> at <strong>${venue || 'Venue to be communicated'}</strong>.
              </p>

              <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">
                As part of the accreditation process, you are kindly requested to submit the required details and supporting documents through the Accreditation Module at your earliest convenience.
              </p>

              <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">
                Accreditation Portal Link: <a href="${portalUrl}">${portalUrl}</a>
              </p>

              <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 24px;">
                We request you to complete your profile registration on the portal to facilitate timely processing of your accreditation.
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
                  Access Portal
                </a>
              </div>

              <p style="font-size:14px;color:#bbb;margin-top:24px;">
                Warm regards,<br/>
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
