import sessionRepository from "@/repositories/session-repository";
import userRepository from "@/repositories/user-repository";
import { exclude } from "@/utils/prisma-utils";
import { User } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { invalidCredentialsError } from "./errors";
import axios from "axios";
import dotenv from "dotenv";
import qs from "query-string";
import userService from "../users-service";
import { v4 as uuid } from "uuid";

dotenv.config();

type GitHubParamsForAccessToken = {
  code: string;
  grant_type: string;
  redirect_uri: string;
  client_id: string;
  client_secret: string;
};

async function loginUserWithGitHub(code: string) {
  const GITHUB_ACESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
  const { REDIRECT_URL, CLIENT_ID, CLIENT_SECRET } = process.env;
  const params: GitHubParamsForAccessToken = {
    code,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URL,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  };

  const getAccessToken = async () => {
    const { data } = await axios.post(GITHUB_ACESS_TOKEN_URL, params, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const { access_token } = qs.parse(data);
    const token = Array.isArray(access_token) ? access_token.join("") : access_token;
    return token;
  };

  const getUserData = async (url: string, token: string) => {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  };

  try {
    const token = await getAccessToken();

    const [emailData, nameData] = await Promise.all([
      getUserData("https://api.github.com/user/emails", token),
      getUserData("https://api.github.com/user", token),
    ]);

    const email = emailData[0].email;
    const name = nameData.name;

    const emailExists = await userService.verifyEmail(email);

    if (emailExists) {
      const user = await getUserOrFail(email);
      const tokenJWT = await createSession(user.id);
      return {
        user: exclude(user, "password"),
        token: tokenJWT,
        name: name,
      };
    } else {
      const createUser = await userService.createUser({ email, password: String(uuid()) });

      const user = await getUserOrFail(createUser.email);
      const tokenJWT = await createSession(user.id);
      return {
        user: { id: user.id, email: user.email },
        token: tokenJWT,
        name: name,
      };
    }
  } catch (error) {
    console.error("An error occurred:", error);
    throw new Error("Failed to log in with GitHub");
  }
}

async function signIn(params: SignInParams): Promise<SignInResult> {
  const { email, password } = params;
  const user = await getUserOrFail(email);

  await validatePasswordOrFail(password, user.password);

  const token = await createSession(user.id);

  return {
    user: exclude(user, "password"),
    token,
  };
}

async function getUserOrFail(email: string): Promise<GetUserOrFailResult> {
  const user = await userRepository.findByEmail(email, { id: true, email: true, password: true });
  if (!user) throw invalidCredentialsError();

  return user;
}

async function createSession(userId: number) {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET);
  await sessionRepository.create({
    token,
    userId,
  });

  return token;
}

async function validatePasswordOrFail(password: string, userPassword: string) {
  const isPasswordValid = await bcrypt.compare(password, userPassword);
  if (!isPasswordValid) throw invalidCredentialsError();
}

export type SignInParams = Pick<User, "email" | "password">;

type SignInResult = {
  user: Pick<User, "id" | "email">;
  token: string;
};

type GetUserOrFailResult = Pick<User, "id" | "email" | "password">;

const authenticationService = {
  signIn, loginUserWithGitHub
};

export default authenticationService;
export * from "./errors";