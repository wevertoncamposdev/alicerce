import { validate } from 'class-validator';
import { IsStrongPassword } from './strong-password.validator';

class Dummy {
  email?: string;

  @IsStrongPassword()
  password!: string;
}

async function validatePassword(password: string, email?: string) {
  const dummy = new Dummy();
  dummy.password = password;
  dummy.email = email;
  return validate(dummy);
}

describe('IsStrongPassword', () => {
  it('rejects a password shorter than 8 characters', async () => {
    const errors = await validatePassword('short1');
    expect(errors).toHaveLength(1);
  });

  it('rejects a password equal to the e-mail in the same object', async () => {
    const errors = await validatePassword(
      'same@example.com',
      'same@example.com',
    );
    expect(errors).toHaveLength(1);
  });

  it('accepts a password equal to the e-mail text when no e-mail is present in the same object', async () => {
    const errors = await validatePassword('password123');
    expect(errors).toHaveLength(0);
  });

  it('accepts a valid, sufficiently long password different from the e-mail', async () => {
    const errors = await validatePassword(
      'a-strong-password',
      'user@example.com',
    );
    expect(errors).toHaveLength(0);
  });
});
