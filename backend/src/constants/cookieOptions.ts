const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
};

export default cookieOptions;
