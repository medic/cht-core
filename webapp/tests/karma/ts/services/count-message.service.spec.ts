import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';

import { CountMessageService } from '@mm-services/count-message.service';

describe('CountMessageService', () => {
  let service: CountMessageService;
  const generateString = function(len) {
    return Array(len + 1).join('m');
  };
  
  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CountMessageService);
  });

  it('should be created', () => {
    expect(service).to.exist;
  });

  it('generates correct message when no val', function(done) {
    const actual = service.label('', false);

    expect(actual).to.equal('message.characters.left|{"messages":0,"characters":160}');
  });

  it('generates correct message when single sms', function(done) {
    const actual = service.label(generateString(101), true);

    expect(actual).to.equal('message.characters.left|{"messages":1,"characters":59}');
  });

  it('generates correct message when multiple sms', function(done) {
    const actual = service.label(generateString(190), true);

    expect(actual).to.equal('message.characters.left.multiple|{"messages":2,"characters":130}');
  });

  it('generates correct message when non gsm characters', function(done) {
    const actual = service.label('hello😀', false);

    expect(actual).to.equal('message.characters.left|{"messages":1,"characters":63}');
  });

});
