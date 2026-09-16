import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const logo = await fetch(
    new URL("../../public/branding/zivexo-logo.png", import.meta.url)
  ).then((res) => res.arrayBuffer());

  const logoBase64 = btoa(
    String.fromCharCode(...new Uint8Array(logo))
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        <img
          src={`data:image/png;base64,${logoBase64}`}
          width="30"
          height="30"
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    { ...size },
  );
}
