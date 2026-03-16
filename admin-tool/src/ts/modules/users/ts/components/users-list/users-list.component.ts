import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'users-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.less'
})
export class UsersListComponent {

  users = [
    { id: 1,  name: 'dr_smith',   fullname: 'Alice Smith',       phone: '555-0101', facility_id: 'f1',  contact_id: 'c1',  inactive: false },
    { id: 2,  name: 'b_wayne',    fullname: 'Bruce Wayne',        phone: '555-0102', facility_id: 'f1',  contact_id: 'c2',  inactive: false },
    { id: 3,  name: 'c_kent',     fullname: 'Clark Kent',         phone: '555-0103', facility_id: 'f2',  contact_id: 'c3',  inactive: false },
    { id: 4,  name: 'd_prince',   fullname: 'Diana Prince',       phone: '555-0104', facility_id: 'f2',  contact_id: 'c4',  inactive: true  },
    { id: 5,  name: 'p_parker',   fullname: 'Peter Parker',       phone: '555-0105', facility_id: 'f1',  contact_id: 'c5',  inactive: false },
    { id: 6,  name: 't_stark',    fullname: 'Tony Stark',         phone: '555-0106', facility_id: 'f3',  contact_id: 'c6',  inactive: false },
    { id: 7,  name: 'n_romanoff', fullname: 'Natasha Romanoff',   phone: '555-0107', facility_id: 'f3',  contact_id: 'c7',  inactive: false },
    { id: 8,  name: 's_rogers',   fullname: 'Steve Rogers',       phone: '555-0108', facility_id: 'f1',  contact_id: 'c8',  inactive: true  },
    { id: 9,  name: 'w_maximoff', fullname: 'Wanda Maximoff',     phone: '555-0109', facility_id: 'f2',  contact_id: 'c9',  inactive: false },
    { id: 10, name: 't_challa',   fullname: "T'Challa",           phone: '555-0110', facility_id: 'f4',  contact_id: 'c10', inactive: false },
    { id: 11, name: 's_strange',  fullname: 'Stephen Strange',    phone: '555-0111', facility_id: 'f5',  contact_id: 'c11', inactive: false },
    { id: 12, name: 't_odinson',  fullname: 'Thor Odinson',       phone: '555-0112', facility_id: 'f5',  contact_id: 'c12', inactive: false },
    { id: 13, name: 'b_banner',   fullname: 'Bruce Banner',       phone: '555-0113', facility_id: 'f1',  contact_id: 'c13', inactive: false },
    { id: 14, name: 'm_murdock',  fullname: 'Matt Murdock',       phone: '555-0114', facility_id: 'f6',  contact_id: 'c14', inactive: false },
    { id: 15, name: 'j_jones',    fullname: 'Jessica Jones',      phone: '555-0115', facility_id: 'f6',  contact_id: 'c15', inactive: true  },
    { id: 16, name: 'l_cage',     fullname: 'Luke Cage',          phone: '555-0116', facility_id: 'f6',  contact_id: 'c16', inactive: false },
    { id: 17, name: 'd_rand',     fullname: 'Danny Rand',         phone: '555-0117', facility_id: 'f6',  contact_id: 'c17', inactive: false },
    { id: 18, name: 'f_castle',   fullname: 'Frank Castle',       phone: '555-0118', facility_id: 'f7',  contact_id: 'c18', inactive: true  },
    { id: 19, name: 's_wilson',   fullname: 'Sam Wilson',         phone: '555-0119', facility_id: 'f1',  contact_id: 'c19', inactive: false },
    { id: 20, name: 'b_barnes',   fullname: 'Bucky Barnes',       phone: '555-0120', facility_id: 'f1',  contact_id: 'c20', inactive: false },
    { id: 21, name: 's_lang',     fullname: 'Scott Lang',         phone: '555-0121', facility_id: 'f8',  contact_id: 'c21', inactive: false },
    { id: 22, name: 'h_pym',      fullname: 'Hank Pym',           phone: '555-0122', facility_id: 'f8',  contact_id: 'c22', inactive: false },
    { id: 23, name: 'j_van_dyne', fullname: 'Janet van Dyne',     phone: '555-0123', facility_id: 'f8',  contact_id: 'c23', inactive: false },
    { id: 24, name: 'o_octavius', fullname: 'Otto Octavius',      phone: '555-0124', facility_id: 'f9',  contact_id: 'c24', inactive: true  },
    { id: 25, name: 'n_osborn',   fullname: 'Norman Osborn',      phone: '555-0125', facility_id: 'f9',  contact_id: 'c25', inactive: true  },
    { id: 26, name: 'e_brock',    fullname: 'Eddie Brock',        phone: '555-0126', facility_id: 'f9',  contact_id: 'c26', inactive: false },
    { id: 27, name: 'k_khan',     fullname: 'Kamala Khan',        phone: '555-0127', facility_id: 'f10', contact_id: 'c27', inactive: false },
    { id: 28, name: 'm_morales',  fullname: 'Miles Morales',      phone: '555-0128', facility_id: 'f10', contact_id: 'c28', inactive: false },
    { id: 29, name: 'g_stacy',    fullname: 'Gwen Stacy',         phone: '555-0129', facility_id: 'f10', contact_id: 'c29', inactive: false },
    { id: 30, name: 'r_williams', fullname: 'Riri Williams',      phone: '555-0130', facility_id: 'f10', contact_id: 'c30', inactive: false },
  ];

  loading = false;
  error = false;

  deleteUser(user: any, event: Event): void {
    event.stopPropagation();
    console.log('borrar', user);
  }

  editUser(user: any): void {
    console.log('editar', user);
  }
}