import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsAny(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isAny',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate() {
          return true; // always passes validation
        },
      },
    });
  };
}
