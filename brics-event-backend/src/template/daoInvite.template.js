import { capitalizeName } from "../config/capitalizeName.js";

export const daoInviteTemplate = ({ name, eventName, start, end, venue }) => {
  const logo = process.env.BRICS_LOGO_URL;
  const portalUrl = `${process.env.FRONTEND_URL}/login`;

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:50px 20px;">
        <table width="520" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align:center; padding:20px 30px;">

              <img src="${logo}" width="150" style="display:block;margin:0 auto 25px;" alt="BRICS INDIA 2026"/>

              <p style="font-size:15px;color:#000;text-align:left;margin:0 0 18px;">
                Dear ${capitalizeName(name)},
              </p>

              <p style="font-size:14px;color:#000;line-height:1.6;text-align:left;margin:0 0 16px;">
                You are hereby invited to undertake the accreditation of delegates for the event 
                <strong>${capitalizeName(eventName)}</strong>, to be held at ${venue}, from ${start}.
              </p>

              <p style="font-size:14px;color:#000;line-height:1.6;text-align:left;margin:0 0 26px;">
                As a designated delegate accreditation officer, you are requested to facilitate the submission of delegate details and required documents through the accreditation module.
              </p>

              <div style="margin:30px 0 18px;">
                <a href="${portalUrl}" 
                   style="
                     background:#f37021;
                     color:#ffffff;
                     padding:12px 28px;
                     border-radius:6px;
                     text-decoration:none;
                     font-size:14px;
                     font-weight:600;
                     display:inline-block;
                   ">
                  Accreditation Portal Link
                </a>
              </div>

              <p style="font-size:13px;color:#000;text-align:left;margin:0 0 30px;">
                Kindly visit the portal and complete your profile registration.
              </p>

              <p style="font-size:13px;color:#000;text-align:left;margin:0 0 20px; ">
                For detailed instructions, please refer to the 
                <a href="${process.env.DAO_PORTAL_GUIDE_URL || '#'}" 
                   style="color:#f37021;text-decoration:underline;">
                  DAO Portal Navigation Document
                </a>.
              </p>

              <p style="font-size:12px;color:#bfbfbf;text-align:left;">
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
