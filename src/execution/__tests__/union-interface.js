/**
 *  Copyright (c) 2015, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

import { expect } from 'chai';
import { describe, it } from 'mocha';

import { execute } from '../execute';
import { parse } from '../../language';
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLList,
  GraphQLString,
  GraphQLBoolean
} from '../../type';


class Dog {
  constructor(name, barks) {
    this.name = name;
    this.barks = barks;
  }
}

class Cat {
  constructor(name, meows) {
    this.name = name;
    this.meows = meows;
  }
}

class Person {
  constructor(name, pets, friends) {
    this.name = name;
    this.pets = pets;
    this.friends = friends;
  }
}

var NamedType = new GraphQLInterfaceType({
  name: 'Named',
  fields: {
    name: { type: GraphQLString }
  }
});

var DogType = new GraphQLObjectType({
  name: 'Dog',
  interfaces: [ NamedType ],
  fields: {
    name: { type: GraphQLString },
    barks: { type: GraphQLBoolean }
  },
  isTypeOf: value => value instanceof Dog
});

var CatType = new GraphQLObjectType({
  name: 'Cat',
  interfaces: [ NamedType ],
  fields: {
    name: { type: GraphQLString },
    meows: { type: GraphQLBoolean }
  },
  isTypeOf: value => value instanceof Cat
});

var PetType = new GraphQLUnionType({
  name: 'Pet',
  types: [ DogType, CatType ],
  resolveType(value) {
    if (value instanceof Dog) {
      return DogType;
    }
    if (value instanceof Cat) {
      return CatType;
    }
  }
});

var PersonType = new GraphQLObjectType({
  name: 'Person',
  interfaces: [ NamedType ],
  fields: {
    name: { type: GraphQLString },
    pets: { type: new GraphQLList(PetType) },
    friends: { type: new GraphQLList(NamedType) },
  },
  isTypeOf: value => value instanceof Person
});

var schema = new GraphQLSchema({
  query: PersonType
});

var garfield = new Cat('Garfield', false);
var odie = new Dog('Odie', true);
var liz = new Person('Liz');
var john = new Person('John', [ garfield, odie ], [ liz, odie ]);

describe('Execute: Union and intersection types', () => {

  it('can introspect on union and intersection types', async () => {
    var ast = parse(`
      {
        Named: __type(name: "Named") {
          kind
          name
          fields { name }
          interfaces { name }
          possibleTypes { name }
          enumValues { name }
          inputFields { name }
        }
        Pet: __type(name: "Pet") {
          kind
          name
          fields { name }
          interfaces { name }
          possibleTypes { name }
          enumValues { name }
          inputFields { name }
        }
      }
    `);

    return expect(
      await execute(schema, ast)
    ).to.deep.equal({
      data: {
        Named: {
          kind: 'INTERFACE',
          name: 'Named',
          fields: [
            { name: 'name' }
          ],
          interfaces: null,
          possibleTypes: [
            { name: 'Dog' },
            { name: 'Cat' },
            { name: 'Person' }
          ],
          enumValues: null,
          inputFields: null
        },
        Pet: {
          kind: 'UNION',
          name: 'Pet',
          fields: null,
          interfaces: null,
          possibleTypes: [
            { name: 'Dog' },
            { name: 'Cat' }
          ],
          enumValues: null,
          inputFields: null
        }
      }
    });
  });

  it('executes using union types', async () => {

    // NOTE: This is an *invalid* query, but it should be an *executable* query.
    var ast = parse(`
      {
        __typename
        name
        pets {
          __typename
          name
          barks
          meows
        }
      }
    `);

    return expect(
      await execute(schema, ast, john)
    ).to.deep.equal({
      data: {
        __typename: 'Person',
        name: 'John',
        pets: [
          { __typename: 'Cat', name: 'Garfield', meows: false },
          { __typename: 'Dog', name: 'Odie', barks: true }
        ]
      }
    });
  });

  it('executes union types with inline fragments', async () => {

    // This is the valid version of the query in the above test.
    var ast = parse(`
      {
        __typename
        name
        pets {
          __typename
          ... on Dog {
            name
            barks
          }
          ... on Cat {
            name
            meows
          }
        }
      }
    `);

    return expect(
      await execute(schema, ast, john)
    ).to.deep.equal({
      data: {
        __typename: 'Person',
        name: 'John',
        pets: [
          { __typename: 'Cat', name: 'Garfield', meows: false },
          { __typename: 'Dog', name: 'Odie', barks: true }
        ]
      }
    });
  });

  it('executes using interface types', async () => {

    // NOTE: This is an *invalid* query, but it should be an *executable* query.
    var ast = parse(`
      {
        __typename
        name
        friends {
          __typename
          name
          barks
          meows
        }
      }
    `);

    return expect(
      await execute(schema, ast, john)
    ).to.deep.equal({
      data: {
        __typename: 'Person',
        name: 'John',
        friends: [
          { __typename: 'Person', name: 'Liz' },
          { __typename: 'Dog', name: 'Odie', barks: true }
        ]
      }
    });
  });

  it('executes union types with inline fragments', async () => {

    // This is the valid version of the query in the above test.
    var ast = parse(`
      {
        __typename
        name
        friends {
          __typename
          name
          ... on Dog {
            barks
          }
          ... on Cat {
            meows
          }
        }
      }
    `);

    return expect(
      await execute(schema, ast, john)
    ).to.deep.equal({
      data: {
        __typename: 'Person',
        name: 'John',
        friends: [
          { __typename: 'Person', name: 'Liz' },
          { __typename: 'Dog', name: 'Odie', barks: true }
        ]
      }
    });
  });

  it('allows fragment conditions to be abstract types', async () => {

    var ast = parse(`
      {
        __typename
        name
        pets { ...PetFields }
        friends { ...FriendFields }
      }

      fragment PetFields on Pet {
        __typename
        ... on Dog {
          name
          barks
        }
        ... on Cat {
          name
          meows
        }
      }

      fragment FriendFields on Named {
        __typename
        name
        ... on Dog {
          barks
        }
        ... on Cat {
          meows
        }
      }
    `);

    return expect(
      await execute(schema, ast, john)
    ).to.deep.equal({
      data: {
        __typename: 'Person',
        name: 'John',
        pets: [
          { __typename: 'Cat', name: 'Garfield', meows: false },
          { __typename: 'Dog', name: 'Odie', barks: true }
        ],
        friends: [
          { __typename: 'Person', name: 'Liz' },
          { __typename: 'Dog', name: 'Odie', barks: true }
        ]
      }
    });
  });
});
