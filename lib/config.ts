export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export const getImageApiUrl = (imagePath: string) =>
  `${BASE_URL}/api/${imagePath}`;
