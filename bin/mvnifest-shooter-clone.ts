#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { MvnifestShooterCloneStack } from "../lib/mvnifest-shooter-clone-stack";

const app = new cdk.App();
new MvnifestShooterCloneStack(
  app,
  `mvnifest-shooter-${process.env.NODE_ENV}`,
  {}
);
