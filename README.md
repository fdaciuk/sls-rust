<h1 align="center">
  π¦ sls-rust
</h1>

<p align="center">
   A β‘ <a href="https://www.serverless.com/framework/docs/">Serverless framework</a> β‘ plugin for <a href="https://www.rust-lang.org/">Rust</a> applications
</p>

> Note: this plugin was inspired on [softprops/serverless-rust](https://github.com/softprops/serverless-rust). 
> Since the `serverless-rust` plugin is not activelly mantained, I created this 
> one to work with minimal effort as possible: without docker, and probably only 
> run on Linux (not tested on other OS). Great for CI environments.

## π¦ Install

You should put the `serverless.yml` file outside the Rust project directory:

```console
.
βββ your_rust_project
βΒ Β  βββ src
βΒ Β  βΒ Β  βββ main.rs
βΒ Β  βββ Cargo.toml
βββ package.json
βββ serverless.yml
```

Install the plugin inside your serverless project with npm.

```console
$ npm i -D sls-rust
```

π‘The `-D` flag adds it to your development dependencies in npm speak

π‘ This plugin assumes you are building Rustlang lambdas targeting the AWS Lambda "provided.al2" runtime. The [AWS Lambda Rust Runtime](https://github.com/awslabs/aws-lambda-rust-runtime) makes this easy.

Add the following to your serverless project's `serverless.yml` file

```yaml
service: demo
frameworkVersion: '3'
configValidationMode: error

provider:
  name: aws
  memorySize: 128
  region: us-east-1

plugins:
  # this registers the plugin with serverless
  - sls-rust

# creates one artifact for each function
package:
  individually: true

functions:
  test:
    # handler value syntax is `{rust_project_path}.{cargo_package_name}`
    handler: rust_project_path.cargo_package_name
    # you must use tags.rust = true to make this plugin works:
    tags:
      rust: true
```

> π‘ The Rust Lambda runtime requires a binary named `bootstrap`. This plugin renames the binary cargo builds to `bootstrap` for you. You do **not** need to do this manually in your `Cargo.toml` configuration file.

In order to use this mode its expected that you install the `x86_64-unknown-linux-musl` target on all platforms locally with

```sh
$ rustup target add x86_64-unknown-linux-musl
```

On linux platforms, you will need to install musl-tools

```sh
$ sudo apt-get update && sudo apt-get install -y musl-tools
```

On Mac OSX, you will need to install a MUSL cross compilation toolchain

```sh
$ brew install filosottile/musl-cross/musl-cross
```

## π€Έ usage

Every [serverless workflow command](https://serverless.com/framework/docs/providers/aws/guide/workflow/) should work out of the box.

### invoke your lambdas locally

```sh
$ npx serverless invoke local -f hello -d '{"hello":"world"}'
```

### deploy your lambdas to the cloud

```sh
$ npx serverless deploy
```

### invoke your lambdas in the cloud directly

```sh
$ npx serverless invoke -f hello -d '{"hello":"world"}'
```

### view your lambdas logs

```sh
$ npx serverless logs -f hello
```

## License 

MIT
