import { capitalizeName } from "../config/capitalizeName.js";

export const speakerWelcomeTemplate = ({
  name,
  title,
  organisationName,
  designation,
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
                Welcome to the BRICS Event Platform! You have been registered as a Speaker on our platform.
              </p>

              <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">
                Your speaker profile has been created with the following details:
              </p>

              <div style="background:#f0f0f0;padding:15px;border-radius:6px;margin:20px 0;">
                <p style="margin:5px 0;"><strong>Name:</strong> ${capitalizeName(name)}</p>
                ${title ? `<p style="margin:5px 0;"><strong>Title:</strong> ${title}</p>` : ""}
                ${organisationName ? `<p style="margin:5px 0;"><strong>Organisation:</strong> ${organisationName}</p>` : ""}
                ${designation ? `<p style="margin:5px 0;"><strong>Designation:</strong> ${designation}</p>` : ""}
              </div>

              <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 24px;">
                You can now access the portal to view upcoming events and complete your speaker profile.
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
                  Login to Portal
                </a>
              </div>

              <p style="font-size:14px;color:#555;margin:0 0 6px;">
                To login, use your email and request an OTP on the login page.
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