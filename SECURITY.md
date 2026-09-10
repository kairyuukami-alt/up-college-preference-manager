# Security reporting

Report suspected account-access, credential, document-visibility or data-disclosure problems directly to the repository owner through an established private contact. If GitHub private vulnerability reporting is enabled, use the repository's Security tab. Do not create a public issue containing student information, passwords, tokens or exploitable details.

Server routes must enforce administrator or student session checks. Client-side hiding is not an authorization mechanism. Student actions must use identity from the authenticated session. Preserve rate limiting, password hashing, profile locks and ownership checks.

Runtime secrets are configured through Sites and excluded from Git. Never put real student documents or database exports in this public repository or CI logs. Publicly released official counselling datasets bundled in the source are distinct from the private operational database.
