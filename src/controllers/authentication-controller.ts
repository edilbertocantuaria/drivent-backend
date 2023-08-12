import authenticationService, { SignInParams } from "@/services/authentication-service";
import { Request, Response } from "express";
import httpStatus from "http-status";
import { string } from "joi";

export async function singInPost(req: Request, res: Response) {
  const { email, password } = req.body as SignInParams;
  try {
    const result = await authenticationService.signIn({ email, password });
    return res.status(httpStatus.OK).send(result);
  } catch (error) {
    return res.status(httpStatus.UNAUTHORIZED).send({});
  }
}

export async function singInGitHub(req: Request, res: Response) {
  console.log('singInGitHUb backend funcionando')
  const code = req.body.code as string;
  console.log(code);
  try {
    if (code) {
      const token = await authenticationService.loginUserWithGitHub(code);
      return res.status(httpStatus.OK).send(token);
    }
  } catch (error) {
    console.log(error)
    return res.status(httpStatus.UNAUTHORIZED).send({});
  }
}


