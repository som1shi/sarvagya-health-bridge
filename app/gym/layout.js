export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0a0f',
};

export const metadata = {
  title: 'Gym Logger',
  manifest: '/gym-manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Gym',
  },
};

export default function GymLayout({ children }) {
  return children;
}
