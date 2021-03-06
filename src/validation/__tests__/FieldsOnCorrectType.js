/**
 *  Copyright (c) 2015, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

import { describe, it } from 'mocha';
import { expectPassesRule, expectFailsRule } from './harness';
import FieldsOnCorrectType from '../rules/FieldsOnCorrectType';
import { undefinedFieldMessage } from '../errors';

function undefinedField(field, type, line, column) {
  return {
    message: undefinedFieldMessage(field, type),
    locations: [ { line: line, column: column } ],
  };
}

describe('Validate: Fields on correct type', () => {

  it('Object field selection', () => {
    expectPassesRule(FieldsOnCorrectType, `
      fragment objectFieldSelection on Dog {
        __typename
        name
      }
    `);
  });

  it('Aliased object field selection', () => {
    expectPassesRule(FieldsOnCorrectType, `
      fragment aliasedObjectFieldSelection on Dog {
        tn : __typename
        otherName : name
      }
    `);
  });

  it('Interface field selection', () => {
    expectPassesRule(FieldsOnCorrectType, `
      fragment interfaceFieldSelection on Pet {
        __typename
        name
      }
    `);
  });

  it('Aliased interface field selection', () => {
    expectPassesRule(FieldsOnCorrectType, `
      fragment interfaceFieldSelection on Pet {
        otherName : name
      }
    `);
  });

  it('Lying alias selection', () => {
    expectPassesRule(FieldsOnCorrectType, `
      fragment lyingAliasSelection on Dog {
        name : nickname
      }
    `);
  });

  it('Ignores fields on unknown type', () => {
    expectPassesRule(FieldsOnCorrectType, `
      fragment unknownSelection on UnknownType {
        unknownField
      }
    `);
  });

  it('Field not defined on fragment', () => {
    expectFailsRule(FieldsOnCorrectType, `
      fragment fieldNotDefined on Dog {
        meowVolume
      }`,
      [undefinedField('meowVolume', 'Dog', 3, 9)]
    );
  });

  it('Field not defined deeply, only reports first', () => {
    expectFailsRule(FieldsOnCorrectType, `
      fragment deepFieldNotDefined on Dog {
        unknown_field {
          deeper_unknown_field
        }
      }`,
      [undefinedField('unknown_field', 'Dog', 3, 9)]
    );
  });

  it('Sub-field not defined', () => {
    expectFailsRule(FieldsOnCorrectType, `
      fragment subFieldNotDefined on Human {
        pets {
          unknown_field
        }
      }`,
      [undefinedField('unknown_field', 'Pet', 4, 11)]
    );
  });

  it('Field not defined on inline fragment', () => {
    expectFailsRule(FieldsOnCorrectType, `
      fragment fieldNotDefined on Pet {
        ... on Dog {
          meowVolume
        }
      }`,
      [undefinedField('meowVolume', 'Dog', 4, 11)]
    );
  });

  it('Aliased field target not defined', () => {
    expectFailsRule(FieldsOnCorrectType, `
      fragment aliasedFieldTargetNotDefined on Dog {
        volume : mooVolume
      }`,
      [undefinedField('mooVolume', 'Dog', 3, 9)]
    );
  });

  it('Aliased lying field target not defined', () => {
    expectFailsRule(FieldsOnCorrectType, `
      fragment aliasedLyingFieldTargetNotDefined on Dog {
        barkVolume : kawVolume
      }`,
      [undefinedField('kawVolume', 'Dog', 3, 9)]
    );
  });

  it('Not defined on interface', () => {
    expectFailsRule(FieldsOnCorrectType, `
      fragment notDefinedOnInterface on Pet {
        tailLength
      }`,
      [undefinedField('tailLength', 'Pet', 3, 9)]
    );
  });

  it('Defined on implmentors but not on interface', () => {
    expectFailsRule(FieldsOnCorrectType, `
      fragment definedOnImplementorsButNotInterface on Pet {
        nickname
      }`,
      [undefinedField('nickname', 'Pet', 3, 9)]
    );
  });

  it('Meta field selection on union', () => {
    expectPassesRule(FieldsOnCorrectType, `
      fragment directFieldSelectionOnUnion on CatOrDog {
        __typename
      }`
    );
  });

  it('Direct field selection on union', () => {
    expectFailsRule(FieldsOnCorrectType, `
      fragment directFieldSelectionOnUnion on CatOrDog {
        directField
      }`,
      [undefinedField('directField', 'CatOrDog', 3, 9)]
    );
  });

  it('Defined on implementors queried on union', () => {
    expectFailsRule(FieldsOnCorrectType, `
      fragment definedOnImplementorsQueriedOnUnion on CatOrDog {
        name
      }`,
      [undefinedField('name', 'CatOrDog', 3, 9)]
    );
  });

  it('valid field in inline fragment', () => {
    expectPassesRule(FieldsOnCorrectType, `
      fragment objectFieldSelection on Pet {
        ... on Dog {
          name
        }
      }
    `);
  });

});
