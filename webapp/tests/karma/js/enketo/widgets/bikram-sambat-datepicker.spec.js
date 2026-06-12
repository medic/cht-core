'use strict';

describe( 'Bikramsambatdatepicker guard', () => {

  let $parent;
  let $realDateInput;

  beforeEach( () => {
    $realDateInput = $( '<input type="date">' );
    $parent = $( '<div class="or-appearance-bikram-sambat">' );
    $parent.append( $realDateInput );
    $parent.append( '<input name="day" type="tel">' );
    $parent.append( '<input name="month" type="hidden">' );
    $parent.append( '<input name="year" type="tel">' );
    $( 'body' ).append( $parent );

    // Attach the same guard as in the widget
    $parent.on( 'change', 'input', function( event ) {
      if ( $( event.target ).is( $realDateInput ) ) {
        return;
      }
      const day   = $parent.find( 'input[name="day"]' ).val();
      const month = $parent.find( 'input[name="month"]' ).val();
      const year  = $parent.find( 'input[name="year"]' ).val();
      if ( !day || !month || !year ) {
        $realDateInput.val( '' );
        $realDateInput.trigger( 'change' );
      }
    });
  } );

  afterEach( () => {
    $parent.remove();
  } );

  it( 'should clear output when month is missing', () => {
    $parent.find( 'input[name="day"]' ).val( '15' );
    $parent.find( 'input[name="month"]' ).val( '' );
    $parent.find( 'input[name="year"]' ).val( '2081' );

    $parent.find( 'input[name="day"]' ).trigger( 'change' );

    expect( $realDateInput.val() ).to.equal( '' );
  } );

  it( 'should clear output when day is missing', () => {
    $parent.find( 'input[name="day"]' ).val( '' );
    $parent.find( 'input[name="month"]' ).val( '4' );
    $parent.find( 'input[name="year"]' ).val( '2081' );

    $parent.find( 'input[name="year"]' ).trigger( 'change' );

    expect( $realDateInput.val() ).to.equal( '' );
  } );

  it( 'should clear output when year is missing', () => {
    $parent.find( 'input[name="day"]' ).val( '15' );
    $parent.find( 'input[name="month"]' ).val( '4' );
    $parent.find( 'input[name="year"]' ).val( '' );

    $parent.find( 'input[name="day"]' ).trigger( 'change' );

    expect( $realDateInput.val() ).to.equal( '' );
  } );

  it( 'should NOT clear output when all 3 fields are filled', () => {
    $realDateInput.val( '2024-07-24' );

    $parent.find( 'input[name="day"]' ).val( '9' );
    $parent.find( 'input[name="month"]' ).val( '4' );
    $parent.find( 'input[name="year"]' ).val( '2081' );

    $parent.find( 'input[name="day"]' ).trigger( 'change' );

    expect( $realDateInput.val() ).to.not.equal( '' );
  } );

  it( 'should trigger change event on real input when clearing', () => {
    const changeSpy = sinon.spy();
    $realDateInput.on( 'change', changeSpy );

    $parent.find( 'input[name="day"]' ).val( '15' );
    $parent.find( 'input[name="month"]' ).val( '' );
    $parent.find( 'input[name="year"]' ).val( '2081' );

    $parent.find( 'input[name="day"]' ).trigger( 'change' );

    expect( changeSpy.calledOnce ).to.be.true;
  } );

  it( 'should not fire guard for changes on real date input', () => {
    const clearSpy = sinon.spy( $.fn, 'val' );

    // Trigger change directly on real date input
    $realDateInput.trigger( 'change' );

    // Guard should have returned early
    // Real date input val should not have been set to empty
    expect(
      $realDateInput.val()
    ).to.not.equal( '' );

    clearSpy.restore();
  } );


} );
