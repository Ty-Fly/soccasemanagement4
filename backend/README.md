# Soc Case Management Backend

### Authentication
Accounts are provisioned directly in the database; the API does not expose
public account creation. `POST /api/register` requires a pre-provisioned
account's email and password, then returns an authenticator secret and
`otpauth://` provisioning URI. Add it to an authenticator app, then confirm
setup at `POST /api/register/verify` with the account password and current
six-digit code. `POST /api/login` requires that code as well as the password;
unconfirmed accounts cannot log in. Authenticator secrets are protected with
ASP.NET Core Data Protection, and a code cannot be reused.

Configure `JwtSettings__SigningKey` as a secret environment variable with at
least 32 UTF-8 bytes before starting the API. The issuer and audience are set
in `appsettings.json`. Persist/share ASP.NET Core Data Protection keys across
restarts and API instances. Apply the database migration with
`dotnet ef database update` before using registration.

### Setup
To setup the C# backend, use the commands below to install the packages of the application.
```
dotnet build
```
This also creates the `bin` and `obj` folders that are needed to run and develop the backend.
