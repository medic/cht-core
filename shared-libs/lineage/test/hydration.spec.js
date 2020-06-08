const chai = require('chai');
const sinon = require('sinon');
const lineageFactory = require('../src');

describe('Lineage', function() {
  let lineage;
  let allDocs;
  let get;
  let query;
  let DB;

  beforeEach(function() {
    allDocs = sinon.stub();
    get = sinon.stub();
    query = sinon.stub();
    DB = { allDocs, get, query };
    lineage = lineageFactory(Promise, DB);
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('fetchLineageById', function() {
    it('queries db with correct parameters', function() {
      query.resolves({ rows: [] });
      const id = 'banana';

      return lineage.fetchLineageById(id).then(() => {
        chai.expect(query.callCount).to.equal(1);
        chai.expect(query.getCall(0).args[0]).to.equal('medic-client/docs_by_id_lineage');
        chai.expect(query.getCall(0).args[1].startkey).to.deep.equal([ id ]);
        chai.expect(query.getCall(0).args[1].endkey).to.deep.equal([ id, {} ]);
        chai.expect(query.getCall(0).args[1].include_docs).to.deep.equal(true);
      });
    });
  });

  describe('fetchContacts', function() {
    it('fetches contacts with correct parameters', function() {
      allDocs.resolves({ rows: [] });
      const fakeLineage = [
        { _id: 'abc', contact: { _id: 'def' }, parent: { _id: 'ghi' } },
        { _id: 'ghi' }
      ];

      return lineage.fetchContacts(fakeLineage).then(() => {
        chai.expect(allDocs.callCount).to.equal(1);
        chai.expect(allDocs.getCall(0).args[0]).to.deep.equal({ keys: ['def'], include_docs: true });
      });
    });

    it('does not fetch contacts that it has already got via lineage', function() {
      allDocs.resolves({ rows: [] });
      const fakeLineage = [
        { _id: 'abc', contact: { _id: 'def' }, parent: { _id: 'def' } },
        { _id: 'def' }
      ];

      return lineage.fetchContacts(fakeLineage).then(() => {
        chai.expect(allDocs.callCount).to.equal(0);
      });
    });
  });

  describe('fillContactsInDocs', function() {
    it('populates the contact field for relevant docs', function() {
      // Given
      const docs = [
        { _id: 'doc1', contact: { _id: 'contact1' } },
        { _id: 'doc2', contact: { _id: 'contact1' } },
        { _id: 'doc3', contact: { _id: 'contact2' } },
        { _id: 'doc4', contact: { _id: 'contactx' } }
      ];
      const contacts = [
        { _id: 'contact1', type: 'person' },
        { _id: 'contact2', type: 'person' }
      ];

      // when
      lineage.fillContactsInDocs(docs, contacts);

      // then
      chai.expect(docs[0].contact).to.deep.equal(contacts[0]);
      chai.expect(docs[1].contact).to.deep.equal(contacts[0]);
      chai.expect(docs[2].contact).to.deep.equal(contacts[1]);
      chai.expect(docs[3].contact).to.deep.equal({ _id: 'contactx' });
    });
  });

  describe('fillParentsInDocs', function() {
    it('populates parent fields throughout lineage', function() {
      // Given
      const doc = {
        _id: 'a',
        parent: {
          _id: 'b',
          parent: {
            _id: 'c',
            parent: {
              _id: 'd'
            }
          }
        }
      };
      const fakeLineage = [
        { _id: 'b', type: 'clinic' },
        null,
        { _id: 'd', type: 'person' },
      ];

      // when
      lineage.fillParentsInDocs(doc, fakeLineage);

      // then
      chai.expect(doc.parent._id).to.deep.equal(fakeLineage[0]._id);
      chai.expect(doc.parent.type).to.deep.equal(fakeLineage[0].type);
      chai.expect(doc.parent.parent._id).to.equal('c');
      chai.expect(doc.parent.parent.parent).to.deep.equal(fakeLineage[2]);
    });

    it('correctly populates parent fields for reports', function() {
      // Given
      const report = {
        _id: 'a',
        type: 'data_record',
        contact: {
          _id: 'contact',
          parent: {
            _id: 'b',
            parent: {
              _id: 'c'
            }
          }
        }
      };
      const contactInLineage = { _id: 'contact', type: 'person', parent: { _id: 'b', parent: { _id: 'c' } } };
      const fakeLineage = [
        contactInLineage,
        null,
        { _id: 'c', type: 'clinic' }
      ];

      // when
      lineage.fillParentsInDocs(report, fakeLineage);

      // then
      chai.expect(report.contact).to.deep.equal(contactInLineage);
      chai.expect(report.contact.parent._id).to.equal('b');
      chai.expect(report.contact.parent.parent).to.deep.equal(fakeLineage[1]);
    });
  });

  describe('hydrateDocs', function() {
    it('works on empty array', function() {
      const docs = [];

      return lineage.hydrateDocs(docs).then((hydratedDocs) => {
        chai.expect(hydratedDocs).to.have.length(0);
      });
    });

    it('works on docs without contacts or parents', function() {
      const docs = [
        { _id: 'a' },
        { _id: 'b' },
      ];

      return lineage.hydrateDocs(docs).then((hydratedDocs) => {
        chai.expect(hydratedDocs).to.deep.equal(docs);
      });
    });
  });

  it('should ', () => {
    const a = [
      {
        "id": "patient_with_empty_linked_contacts",
        "doc": {
          "_id": "patient_with_empty_linked_contacts",
          "_rev": "1-3608970766954a0a459d0d7a3df0aa3a",
          "type": "person",
          "parent": {
            "_id": "clinic_with_linked_contacts",
            "_rev": "1-af05f192f7915390399e106e9ff47177",
            "type": "clinic",
            "parent": {
              "_id": "center_with_linked_contacts",
              "_rev": "1-a3fc62ecda61a51e4512888df24927ed",
              "type": "health_center",
              "parent": {
                "_id": "PARENT_PLACE",
                "_rev": "1-680564a10e2d1d4c04c042319857bb13",
                "type": "district_hospital",
                "name": "Big Parent Hospital"
              },
              "name": "center_with_linked_contacts",
              "contact": {
                "_id": "chw_with_linked_contacts",
                "_rev": "1-6d7bb6f066cc5b8d2990aeeb84a0d2bb",
                "type": "person",
                "parent": {
                  "_id": "clinic_with_linked_contacts",
                  "parent": {
                    "_id": "center_with_linked_contacts",
                    "parent": {
                      "_id": "PARENT_PLACE"
                    }
                  }
                },
                "name": "chw_with_linked_contacts",
                "linked_contacts": {
                  "one": {
                    "_id": "patient_with_linked_contacts",
                    "_rev": "1-487626aa66e522e563bb1df68b9b55c0",
                    "type": "person",
                    "parent": {
                      "_id": "clinic_with_linked_contacts",
                      "parent": {
                        "_id": "center_with_linked_contacts",
                        "parent": {
                          "_id": "PARENT_PLACE"
                        }
                      }
                    },
                    "name": "patient_with_linked_contacts",
                    "linked_contacts": {
                      "_id": {
                        "_id": "center_with_linked_contacts",
                        "_rev": "1-a3fc62ecda61a51e4512888df24927ed",
                        "type": "health_center",
                        "parent": {
                          "_id": "PARENT_PLACE"
                        },
                        "name": "center_with_linked_contacts",
                        "contact": {
                          "_id": "chw_with_linked_contacts"
                        }
                      }
                    }
                  },
                  "three": false,
                  "four": []
                }
              }
            },
            "contact": {
              "_id": "chw_with_linked_contacts",
              "_rev": "1-6d7bb6f066cc5b8d2990aeeb84a0d2bb",
              "type": "person",
              "parent": {
                "_id": "clinic_with_linked_contacts",
                "parent": {
                  "_id": "center_with_linked_contacts",
                  "parent": {
                    "_id": "PARENT_PLACE"
                  }
                }
              },
              "name": "chw_with_linked_contacts",
              "linked_contacts": {
                "one": {
                  "_id": "patient_with_linked_contacts",
                  "_rev": "1-487626aa66e522e563bb1df68b9b55c0",
                  "type": "person",
                  "parent": {
                    "_id": "clinic_with_linked_contacts",
                    "parent": {
                      "_id": "center_with_linked_contacts",
                      "parent": {
                        "_id": "PARENT_PLACE"
                      }
                    }
                  },
                  "name": "patient_with_linked_contacts",
                  "linked_contacts": {
                    "_id": {
                      "_id": "center_with_linked_contacts",
                      "_rev": "1-a3fc62ecda61a51e4512888df24927ed",
                      "type": "health_center",
                      "parent": {
                        "_id": "PARENT_PLACE"
                      },
                      "name": "center_with_linked_contacts",
                      "contact": {
                        "_id": "chw_with_linked_contacts"
                      }
                    }
                  }
                },
                "three": false,
                "four": []
              }
            },
            "linked_contacts": {
              "first": {
                "_id": "chw_with_linked_contacts",
                "_rev": "1-6d7bb6f066cc5b8d2990aeeb84a0d2bb",
                "type": "person",
                "parent": {
                  "_id": "clinic_with_linked_contacts",
                  "parent": {
                    "_id": "center_with_linked_contacts",
                    "parent": {
                      "_id": "PARENT_PLACE"
                    }
                  }
                },
                "name": "chw_with_linked_contacts",
                "linked_contacts": {
                  "one": {
                    "_id": "patient_with_linked_contacts",
                    "_rev": "1-487626aa66e522e563bb1df68b9b55c0",
                    "type": "person",
                    "parent": {
                      "_id": "clinic_with_linked_contacts",
                      "parent": {
                        "_id": "center_with_linked_contacts",
                        "parent": {
                          "_id": "PARENT_PLACE"
                        }
                      }
                    },
                    "name": "patient_with_linked_contacts",
                    "linked_contacts": {
                      "_id": {
                        "_id": "center_with_linked_contacts",
                        "_rev": "1-a3fc62ecda61a51e4512888df24927ed",
                        "type": "health_center",
                        "parent": {
                          "_id": "PARENT_PLACE"
                        },
                        "name": "center_with_linked_contacts",
                        "contact": {
                          "_id": "chw_with_linked_contacts"
                        }
                      }
                    }
                  },
                  "three": false,
                  "four": []
                }
              },
              "second": {
                "_id": "patient4",
                "_rev": "1-ad5941856b1905da88688cdcf4ee8977",
                "type": "person",
                "name": "patient4",
                "parent": {
                  "_id": "clinic2",
                  "parent": {
                    "_id": "hc2",
                    "parent": {
                      "_id": "DISTRICT_2"
                    }
                  }
                }
              }
            }
          },
          "name": "patient_with_linked_contacts",
          "linked_contacts": {}
        }
      },
      {
        "id": "patient_with_linked_contacts",
        "doc": {
          "_id": "patient_with_linked_contacts",
          "_rev": "1-487626aa66e522e563bb1df68b9b55c0",
          "type": "person",
          "parent": {
            "_id": "clinic_with_linked_contacts",
            "_rev": "1-af05f192f7915390399e106e9ff47177",
            "type": "clinic",
            "parent": {
              "_id": "center_with_linked_contacts",
              "_rev": "1-a3fc62ecda61a51e4512888df24927ed",
              "type": "health_center",
              "parent": {
                "_id": "PARENT_PLACE",
                "_rev": "1-680564a10e2d1d4c04c042319857bb13",
                "type": "district_hospital",
                "name": "Big Parent Hospital"
              },
              "name": "center_with_linked_contacts",
              "contact": {
                "_id": "chw_with_linked_contacts",
                "_rev": "1-6d7bb6f066cc5b8d2990aeeb84a0d2bb",
                "type": "person",
                "parent": {
                  "_id": "clinic_with_linked_contacts",
                  "parent": {
                    "_id": "center_with_linked_contacts",
                    "parent": {
                      "_id": "PARENT_PLACE"
                    }
                  }
                },
                "name": "chw_with_linked_contacts",
                "linked_contacts": {
                  "one": {
                    "_id": "patient_with_linked_contacts",
                    "_rev": "1-487626aa66e522e563bb1df68b9b55c0",
                    "type": "person",
                    "parent": {
                      "_id": "clinic_with_linked_contacts",
                      "parent": {
                        "_id": "center_with_linked_contacts",
                        "parent": {
                          "_id": "PARENT_PLACE"
                        }
                      }
                    },
                    "name": "patient_with_linked_contacts",
                    "linked_contacts": {
                      "_id": {
                        "_id": "center_with_linked_contacts",
                        "_rev": "1-a3fc62ecda61a51e4512888df24927ed",
                        "type": "health_center",
                        "parent": {
                          "_id": "PARENT_PLACE"
                        },
                        "name": "center_with_linked_contacts",
                        "contact": {
                          "_id": "chw_with_linked_contacts"
                        }
                      }
                    }
                  },
                  "three": false,
                  "four": []
                }
              }
            },
            "contact": {
              "_id": "chw_with_linked_contacts",
              "_rev": "1-6d7bb6f066cc5b8d2990aeeb84a0d2bb",
              "type": "person",
              "parent": {
                "_id": "clinic_with_linked_contacts",
                "parent": {
                  "_id": "center_with_linked_contacts",
                  "parent": {
                    "_id": "PARENT_PLACE"
                  }
                }
              },
              "name": "chw_with_linked_contacts",
              "linked_contacts": {
                "one": {
                  "_id": "patient_with_linked_contacts",
                  "_rev": "1-487626aa66e522e563bb1df68b9b55c0",
                  "type": "person",
                  "parent": {
                    "_id": "clinic_with_linked_contacts",
                    "parent": {
                      "_id": "center_with_linked_contacts",
                      "parent": {
                        "_id": "PARENT_PLACE"
                      }
                    }
                  },
                  "name": "patient_with_linked_contacts",
                  "linked_contacts": {
                    "_id": {
                      "_id": "center_with_linked_contacts",
                      "_rev": "1-a3fc62ecda61a51e4512888df24927ed",
                      "type": "health_center",
                      "parent": {
                        "_id": "PARENT_PLACE"
                      },
                      "name": "center_with_linked_contacts",
                      "contact": {
                        "_id": "chw_with_linked_contacts"
                      }
                    }
                  }
                },
                "three": false,
                "four": []
              }
            },
            "linked_contacts": {
              "first": {
                "_id": "chw_with_linked_contacts",
                "_rev": "1-6d7bb6f066cc5b8d2990aeeb84a0d2bb",
                "type": "person",
                "parent": {
                  "_id": "clinic_with_linked_contacts",
                  "parent": {
                    "_id": "center_with_linked_contacts",
                    "parent": {
                      "_id": "PARENT_PLACE"
                    }
                  }
                },
                "name": "chw_with_linked_contacts",
                "linked_contacts": {
                  "one": {
                    "_id": "patient_with_linked_contacts",
                    "_rev": "1-487626aa66e522e563bb1df68b9b55c0",
                    "type": "person",
                    "parent": {
                      "_id": "clinic_with_linked_contacts",
                      "parent": {
                        "_id": "center_with_linked_contacts",
                        "parent": {
                          "_id": "PARENT_PLACE"
                        }
                      }
                    },
                    "name": "patient_with_linked_contacts",
                    "linked_contacts": {
                      "_id": {
                        "_id": "center_with_linked_contacts",
                        "_rev": "1-a3fc62ecda61a51e4512888df24927ed",
                        "type": "health_center",
                        "parent": {
                          "_id": "PARENT_PLACE"
                        },
                        "name": "center_with_linked_contacts",
                        "contact": {
                          "_id": "chw_with_linked_contacts"
                        }
                      }
                    }
                  },
                  "three": false,
                  "four": []
                }
              },
              "second": {
                "_id": "patient4",
                "_rev": "1-ad5941856b1905da88688cdcf4ee8977",
                "type": "person",
                "name": "patient4",
                "parent": {
                  "_id": "clinic2",
                  "parent": {
                    "_id": "hc2",
                    "parent": {
                      "_id": "DISTRICT_2"
                    }
                  }
                }
              }
            }
          },
          "name": "patient_with_linked_contacts",
          "linked_contacts": {
            "_id": {
              "_id": "center_with_linked_contacts",
              "_rev": "1-a3fc62ecda61a51e4512888df24927ed",
              "type": "health_center",
              "parent": {
                "_id": "PARENT_PLACE"
              },
              "name": "center_with_linked_contacts",
              "contact": {
                "_id": "chw_with_linked_contacts"
              }
            }
          }
        }
      },
      {
        "id": "chw_with_linked_contacts",
        "doc": {
          "_id": "chw_with_linked_contacts",
          "_rev": "1-6d7bb6f066cc5b8d2990aeeb84a0d2bb",
          "type": "person",
          "parent": {
            "_id": "clinic_with_linked_contacts",
            "_rev": "1-af05f192f7915390399e106e9ff47177",
            "type": "clinic",
            "parent": {
              "_id": "center_with_linked_contacts",
              "_rev": "1-a3fc62ecda61a51e4512888df24927ed",
              "type": "health_center",
              "parent": {
                "_id": "PARENT_PLACE",
                "_rev": "1-680564a10e2d1d4c04c042319857bb13",
                "type": "district_hospital",
                "name": "Big Parent Hospital"
              },
              "name": "center_with_linked_contacts",
              "contact": {
                "_id": "chw_with_linked_contacts",
                "_rev": "1-6d7bb6f066cc5b8d2990aeeb84a0d2bb",
                "type": "person",
                "parent": {
                  "_id": "clinic_with_linked_contacts",
                  "parent": {
                    "_id": "center_with_linked_contacts",
                    "parent": {
                      "_id": "PARENT_PLACE"
                    }
                  }
                },
                "name": "chw_with_linked_contacts",
                "linked_contacts": {
                  "one": {
                    "_id": "patient_with_linked_contacts",
                    "_rev": "1-487626aa66e522e563bb1df68b9b55c0",
                    "type": "person",
                    "parent": {
                      "_id": "clinic_with_linked_contacts",
                      "parent": {
                        "_id": "center_with_linked_contacts",
                        "parent": {
                          "_id": "PARENT_PLACE"
                        }
                      }
                    },
                    "name": "patient_with_linked_contacts",
                    "linked_contacts": {
                      "_id": {
                        "_id": "center_with_linked_contacts",
                        "_rev": "1-a3fc62ecda61a51e4512888df24927ed",
                        "type": "health_center",
                        "parent": {
                          "_id": "PARENT_PLACE"
                        },
                        "name": "center_with_linked_contacts",
                        "contact": {
                          "_id": "chw_with_linked_contacts"
                        }
                      }
                    }
                  },
                  "three": false,
                  "four": []
                }
              }
            },
            "contact": {
              "_id": "chw_with_linked_contacts",
              "_rev": "1-6d7bb6f066cc5b8d2990aeeb84a0d2bb",
              "type": "person",
              "parent": {
                "_id": "clinic_with_linked_contacts",
                "parent": {
                  "_id": "center_with_linked_contacts",
                  "parent": {
                    "_id": "PARENT_PLACE"
                  }
                }
              },
              "name": "chw_with_linked_contacts",
              "linked_contacts": {
                "one": {
                  "_id": "patient_with_linked_contacts",
                  "_rev": "1-487626aa66e522e563bb1df68b9b55c0",
                  "type": "person",
                  "parent": {
                    "_id": "clinic_with_linked_contacts",
                    "parent": {
                      "_id": "center_with_linked_contacts",
                      "parent": {
                        "_id": "PARENT_PLACE"
                      }
                    }
                  },
                  "name": "patient_with_linked_contacts",
                  "linked_contacts": {
                    "_id": {
                      "_id": "center_with_linked_contacts",
                      "_rev": "1-a3fc62ecda61a51e4512888df24927ed",
                      "type": "health_center",
                      "parent": {
                        "_id": "PARENT_PLACE"
                      },
                      "name": "center_with_linked_contacts",
                      "contact": {
                        "_id": "chw_with_linked_contacts"
                      }
                    }
                  }
                },
                "three": false,
                "four": []
              }
            },
            "linked_contacts": {
              "first": {
                "_id": "chw_with_linked_contacts",
                "_rev": "1-6d7bb6f066cc5b8d2990aeeb84a0d2bb",
                "type": "person",
                "parent": {
                  "_id": "clinic_with_linked_contacts",
                  "parent": {
                    "_id": "center_with_linked_contacts",
                    "parent": {
                      "_id": "PARENT_PLACE"
                    }
                  }
                },
                "name": "chw_with_linked_contacts",
                "linked_contacts": {
                  "one": {
                    "_id": "patient_with_linked_contacts",
                    "_rev": "1-487626aa66e522e563bb1df68b9b55c0",
                    "type": "person",
                    "parent": {
                      "_id": "clinic_with_linked_contacts",
                      "parent": {
                        "_id": "center_with_linked_contacts",
                        "parent": {
                          "_id": "PARENT_PLACE"
                        }
                      }
                    },
                    "name": "patient_with_linked_contacts",
                    "linked_contacts": {
                      "_id": {
                        "_id": "center_with_linked_contacts",
                        "_rev": "1-a3fc62ecda61a51e4512888df24927ed",
                        "type": "health_center",
                        "parent": {
                          "_id": "PARENT_PLACE"
                        },
                        "name": "center_with_linked_contacts",
                        "contact": {
                          "_id": "chw_with_linked_contacts"
                        }
                      }
                    }
                  },
                  "three": false,
                  "four": []
                }
              },
              "second": {
                "_id": "patient4",
                "_rev": "1-ad5941856b1905da88688cdcf4ee8977",
                "type": "person",
                "name": "patient4",
                "parent": {
                  "_id": "clinic2",
                  "parent": {
                    "_id": "hc2",
                    "parent": {
                      "_id": "DISTRICT_2"
                    }
                  }
                }
              }
            }
          },
          "name": "chw_with_linked_contacts",
          "linked_contacts": {
            "one": {
              "_id": "patient_with_linked_contacts",
              "_rev": "1-487626aa66e522e563bb1df68b9b55c0",
              "type": "person",
              "parent": {
                "_id": "clinic_with_linked_contacts",
                "parent": {
                  "_id": "center_with_linked_contacts",
                  "parent": {
                    "_id": "PARENT_PLACE"
                  }
                }
              },
              "name": "patient_with_linked_contacts",
              "linked_contacts": {
                "_id": {
                  "_id": "center_with_linked_contacts",
                  "_rev": "1-a3fc62ecda61a51e4512888df24927ed",
                  "type": "health_center",
                  "parent": {
                    "_id": "PARENT_PLACE"
                  },
                  "name": "center_with_linked_contacts",
                  "contact": {
                    "_id": "chw_with_linked_contacts"
                  }
                }
              }
            },
            "three": false,
            "four": []
          }
        }
      }
    ];
    const b = [
      {
        "id": "patient_with_empty_linked_contacts",
        "doc": {
          "_id": "patient_with_empty_linked_contacts",
          "type": "person",
          "parent": {
            "_id": "clinic_with_linked_contacts",
            "type": "clinic",
            "parent": {
              "_id": "center_with_linked_contacts",
              "type": "health_center",
              "parent": {
                "_id": "PARENT_PLACE",
                "type": "district_hospital",
                "name": "Big Parent Hospital"
              },
              "name": "center_with_linked_contacts",
              "contact": {
                "_id": "chw_with_linked_contacts",
                "type": "person",
                "parent": {
                  "_id": "clinic_with_linked_contacts",
                  "parent": {
                    "_id": "center_with_linked_contacts",
                    "parent": {
                      "_id": "PARENT_PLACE"
                    }
                  }
                },
                "name": "chw_with_linked_contacts",
                "linked_contacts": {
                  "one": {
                    "_id": "patient_with_linked_contacts"
                  },
                  "three": false,
                  "four": []
                }
              }
            },
            "contact": {
              "_id": "chw_with_linked_contacts",
              "type": "person",
              "parent": {
                "_id": "clinic_with_linked_contacts",
                "parent": {
                  "_id": "center_with_linked_contacts",
                  "parent": {
                    "_id": "PARENT_PLACE"
                  }
                }
              },
              "name": "chw_with_linked_contacts",
              "linked_contacts": {
                "one": {
                  "_id": "patient_with_linked_contacts"
                },
                "three": false,
                "four": []
              }
            },
            "linked_contacts": {
              "first": {
                "_id": "chw_with_linked_contacts",
                "type": "person",
                "parent": {
                  "_id": "clinic_with_linked_contacts",
                  "parent": {
                    "_id": "center_with_linked_contacts",
                    "parent": {
                      "_id": "PARENT_PLACE"
                    }
                  }
                },
                "name": "chw_with_linked_contacts",
                "linked_contacts": {
                  "one": {
                    "_id": "patient_with_linked_contacts"
                  },
                  "three": false,
                  "four": []
                }
              },
              "second": {
                "_id": "patient4",
                "type": "person",
                "name": "patient4",
                "parent": {
                  "_id": "clinic2",
                  "parent": {
                    "_id": "hc2",
                    "parent": {
                      "_id": "DISTRICT_2"
                    }
                  }
                }
              }
            }
          },
          "name": "patient_with_linked_contacts",
          "linked_contacts": {}
        }
      },
      {
        "id": "patient_with_linked_contacts",
        "doc": {
          "_id": "patient_with_linked_contacts",
          "type": "person",
          "parent": {
            "_id": "clinic_with_linked_contacts",
            "type": "clinic",
            "parent": {
              "_id": "center_with_linked_contacts",
              "type": "health_center",
              "parent": {
                "_id": "PARENT_PLACE",
                "type": "district_hospital",
                "name": "Big Parent Hospital"
              },
              "name": "center_with_linked_contacts",
              "contact": {
                "_id": "chw_with_linked_contacts",
                "type": "person",
                "parent": {
                  "_id": "clinic_with_linked_contacts",
                  "parent": {
                    "_id": "center_with_linked_contacts",
                    "parent": {
                      "_id": "PARENT_PLACE"
                    }
                  }
                },
                "name": "chw_with_linked_contacts",
                "linked_contacts": {
                  "one": {
                    "_id": "patient_with_linked_contacts"
                  },
                  "three": false,
                  "four": []
                }
              }
            },
            "contact": {
              "_id": "chw_with_linked_contacts",
              "type": "person",
              "parent": {
                "_id": "clinic_with_linked_contacts",
                "parent": {
                  "_id": "center_with_linked_contacts",
                  "parent": {
                    "_id": "PARENT_PLACE"
                  }
                }
              },
              "name": "chw_with_linked_contacts",
              "linked_contacts": {
                "one": {
                  "_id": "patient_with_linked_contacts"
                },
                "three": false,
                "four": []
              }
            },
            "linked_contacts": {
              "first": {
                "_id": "chw_with_linked_contacts",
                "type": "person",
                "parent": {
                  "_id": "clinic_with_linked_contacts",
                  "parent": {
                    "_id": "center_with_linked_contacts",
                    "parent": {
                      "_id": "PARENT_PLACE"
                    }
                  }
                },
                "name": "chw_with_linked_contacts",
                "linked_contacts": {
                  "one": {
                    "_id": "patient_with_linked_contacts"
                  },
                  "three": false,
                  "four": []
                }
              },
              "second": {
                "_id": "patient4",
                "type": "person",
                "name": "patient4",
                "parent": {
                  "_id": "clinic2",
                  "parent": {
                    "_id": "hc2",
                    "parent": {
                      "_id": "DISTRICT_2"
                    }
                  }
                }
              }
            }
          },
          "name": "patient_with_linked_contacts",
          "linked_contacts": {
            "_id": {
              "_id": "center_with_linked_contacts",
              "type": "health_center",
              "parent": {
                "_id": "PARENT_PLACE"
              },
              "name": "center_with_linked_contacts",
              "contact": {
                "_id": "chw_with_linked_contacts"
              }
            }
          }
        }
      },
      {
        "id": "chw_with_linked_contacts",
        "doc": {
          "_id": "chw_with_linked_contacts",
          "type": "person",
          "parent": {
            "_id": "clinic_with_linked_contacts",
            "type": "clinic",
            "parent": {
              "_id": "center_with_linked_contacts",
              "type": "health_center",
              "parent": {
                "_id": "PARENT_PLACE",
                "type": "district_hospital",
                "name": "Big Parent Hospital"
              },
              "name": "center_with_linked_contacts",
              "contact": {
                "_id": "chw_with_linked_contacts",
                "type": "person",
                "parent": {
                  "_id": "clinic_with_linked_contacts",
                  "parent": {
                    "_id": "center_with_linked_contacts",
                    "parent": {
                      "_id": "PARENT_PLACE"
                    }
                  }
                },
                "name": "chw_with_linked_contacts",
                "linked_contacts": {
                  "one": {
                    "_id": "patient_with_linked_contacts"
                  },
                  "three": false,
                  "four": []
                }
              }
            },
            "contact": {
              "_id": "chw_with_linked_contacts",
              "type": "person",
              "parent": {
                "_id": "clinic_with_linked_contacts",
                "parent": {
                  "_id": "center_with_linked_contacts",
                  "parent": {
                    "_id": "PARENT_PLACE"
                  }
                }
              },
              "name": "chw_with_linked_contacts",
              "linked_contacts": {
                "one": {
                  "_id": "patient_with_linked_contacts"
                },
                "three": false,
                "four": []
              }
            },
            "linked_contacts": {
              "first": {
                "_id": "chw_with_linked_contacts",
                "type": "person",
                "parent": {
                  "_id": "clinic_with_linked_contacts",
                  "parent": {
                    "_id": "center_with_linked_contacts",
                    "parent": {
                      "_id": "PARENT_PLACE"
                    }
                  }
                },
                "name": "chw_with_linked_contacts",
                "linked_contacts": {
                  "one": {
                    "_id": "patient_with_linked_contacts"
                  },
                  "three": false,
                  "four": []
                }
              },
              "second": {
                "_id": "patient4",
                "type": "person",
                "name": "patient4",
                "parent": {
                  "_id": "clinic2",
                  "parent": {
                    "_id": "hc2",
                    "parent": {
                      "_id": "DISTRICT_2"
                    }
                  }
                }
              }
            }
          },
          "name": "chw_with_linked_contacts",
          "linked_contacts": {
            "one": {
              "_id": "patient_with_linked_contacts",
              "type": "person",
              "parent": {
                "_id": "clinic_with_linked_contacts",
                "parent": {
                  "_id": "center_with_linked_contacts",
                  "parent": {
                    "_id": "PARENT_PLACE"
                  }
                }
              },
              "name": "patient_with_linked_contacts",
              "linked_contacts": {
                "_id": "center_with_linked_contacts"
              }
            },
            "three": false,
            "four": []
          }
        }
      }
    ];
    chai.expect(a).excludingEvery('_rev').to.deep.equal(b);
  });
});
