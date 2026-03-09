import React from 'react';

export type IconName = 'coffeeBean' | 'plus' | 'chevronDown' | 'upload' | 'download' | 'printer' | 'trash' | 'check' | 'money' | 'truck' | 'sun' | 'moon' | 'droplet' | 'archiveBox' | 'cog' | 'wrenchScrewdriver' | 'refresh' | 'pencil' | 'xMark' | 'arrowDown' | 'arrowUp' | 'chartBar' | 'switchHorizontal' | 'documentText' | 'arrowLeft' | 'informationCircle' | 'beaker' | 'user' | 'envelope' | 'shieldCheck';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  title?: string;
}

const ICONS: Record<IconName, React.ReactNode> = {
  coffeeBean: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 10a4 4 0 11-8 0 4 4 0 018 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 10c0 4-3.582 8-8 8s-8-4-8-8 3.582-8 8-8 8 4 8 8z" clipRule="evenodd" transform="rotate(-45 10 10)" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 4v12" transform="rotate(-45 10 10)" />
    </>
  ),
  plus: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />,
  chevronDown: <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />,
  upload: <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />,
  download: <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />,
  printer: <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6 18.25m0 0a2.25 2.25 0 0 0 2.25 2.25h8.5A2.25 2.25 0 0 0 19 18.25m-13 0-1.41-1.41a2.25 2.25 0 0 1 0-3.182l5.66-5.66a2.25 2.25 0 0 1 3.182 0l5.66 5.66a2.25 2.25 0 0 1 0 3.182l-1.41 1.41M6 18.25h.008v.008H6v-.008Zm12 0h.008v.008H18v-.008Zm-7.5-11.25h.008v.008h-.008V7Z" />,
  trash: <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.077-2.09.921-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />,
  check: <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />,
  money: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />,
  truck: <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 0v1.125c0 .621-.504 1.125-1.125 1.125H4.5A1.125 1.125 0 0 1 3.375 15V9.75Z" />,
  sun: <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />,
  moon: <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />,
  droplet: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 8.471c2.118 2.119 2.118 5.545 0 7.664-2.119 2.118-5.545 2.118-7.664 0-2.118-2.119-2.118-5.545 0-7.664 2.119-2.118 5.545-2.118 7.664 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m12 18 3.034-3.034" />
    </>
  ),
  archiveBox: <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4" />,
  cog: <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0 0 15 0m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m18 0h-1.5" />,
  wrenchScrewdriver: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.87-5.87a2.652 2.652 0 0 0-4.95.007l-.103.104a2.652 2.652 0 0 1-3.729 3.729l.104.103a2.652 2.652 0 0 0 .006 4.95m-3.729-3.729.006-.006a2.652 2.652 0 0 1 3.729 0l.006.006m-3.735 0-3.009-3.009a2.652 2.652 0 0 1 0-3.729l3.009 3.009Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12.553 14.707 13.5 13.76a2.65 2.65 0 0 1 3.728 0l.232.231a2.65 2.65 0 0 1 0 3.728l-1.043 1.043-1.88-1.88Z" />
    </>
  ),
  refresh: <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 11.664 0l3.181-3.183m-4.991-2.691v4.992h-4.992m0 0-3.181-3.183a8.25 8.25 0 0 1 11.664 0l3.181 3.183" />,
  pencil: <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />,
  xMark: <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />,
  arrowDown: <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />,
  arrowUp: <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5 12 3m0 0-7.5-7.5M12 3v18" />,
  chartBar: <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />,
  switchHorizontal: <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0-4-4m4 4-4 4m0 6H4m0 0l4 4m-4-4l4-4" />,
  documentText: <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />,
  arrowLeft: <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />,
  informationCircle: <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />,
  beaker: <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v1.244c0 .462.202.9.553 1.202l5.444 4.667c.351.301.553.74.553 1.202v1.244m-6.553-8.315a6.75 6.75 0 0 0-1.5 0V5.25m1.5-2.146c.147 0 .294.004.44.012a6.75 6.75 0 0 1 1.5 0V5.25m-4.5 0h4.5m-4.5 0v3.104c0 .462.202.9.553 1.202l5.444 4.667c.351.301.553.74.553 1.202v4.381c0 .63-.39 1.19-.986 1.414l-4.014 1.506c-.659.247-1.38-.099-1.636-.772a1.875 1.875 0 0 1 0-1.281l1.506-4.014a1.875 1.875 0 0 1 1.414-.986h4.381" />,
  user: <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />,
  envelope: <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />,
  shieldCheck: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
};

export const Icon: React.FC<IconProps> = ({ name, title, className = "w-6 h-6", ...props }) => {
  const isStroked = !['coffeeBean'].includes(name); // Example if some icons are filled

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={isStroked ? "none" : "currentColor"}
      strokeWidth={isStroked ? 1.5 : 0}
      stroke="currentColor"
      className={className}
      {...props}
    >
      {title && <title>{title}</title>}
      {ICONS[name]}
    </svg>
  );
};
