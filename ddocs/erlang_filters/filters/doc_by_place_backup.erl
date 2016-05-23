% Benchmarking code for Erlang REPL nicked and modified to remove module param from here:
%  https://erlangcentral.org/wiki/index.php/Measuring_Function_Execution_Time
% Params: FnName, Params, Rounds, eg:
%  TC(DeepGet, [DeepGet, [<<"userCtx">>, <<"name">>], Req], 100000).
% TC = fun(TC_F, TC_A, TC_N) when TC_N > 0 -> TC_L = tl([begin {TC_T, _Result} = timer:tc(TC_F, TC_A), TC_T end || _ <- lists:seq(1, TC_N)]), TC_Min = lists:min(TC_L), TC_Max = lists:max(TC_L), TC_Med = lists:nth(round((TC_N - 1) / 2), lists:sort(TC_L)), TC_Avg = round(lists:foldl(fun(TC_X, TC_Sum) -> TC_X + TC_Sum end, 0, TC_L) / (TC_N - 1)), io:format("Range: ~b - ~b mics~nMedian: ~b mics ~nAverage: ~b mics~n", [TC_Min, TC_Max, TC_Med, TC_Avg]), TC_Med end.

% Dev workflow, to push your local changes, 2 options :
% 1 - Futon option :
% The following disgusting display of black magic will copy the minified filter function in your paste buffer.
% Paste it into futon.
% cat scratch.erl | sed 's/%.*//' | sed 's/"/\\"/'g | sed -e ':a' -e 'N' -e '$!ba' -e 's/\n/ /g' | pbcopy
% 2 - Curl option: (totally scriptable, feel free to write a script)
%   a - Compile locally into ddoc format :
% kanso show ddocs/erlang_filters > myerlang.json
%   b - Get current version number of the ddoc and copy it :
% curl -X GET $COUCH/medic/_design/erlang_filters
%   c - Update the new ddoc :
% curl -X PUT $COUCH/medic/_design/erlang_filters -H 'Content-Type: application/json'  -d @myerlang.json -H 'If-Match: <paste rev here>'
%

% Logging : something like `io:format("~p", TheDataStructure)` should work. (~p is pretty format)

% A note about performance: function calls seem to be very expensive when code is eval'd this way,
%                           so avoid them where you can. Ideally we'd get rid of SafeGetValue completely
fun ({Doc}, {Req}) ->
  WhoCanSeeThisDoc = proplists:get_value(<<"whoCanSeeThisDoc">>, Doc),
  case WhoCanSeeThisDoc =/= undefined of
    true ->
      % shortcut
      % QueryId = DeepGet(DeepGet, [<<"query">>, <<"id">>], Req),
      QueryId = proplists:get_value(<<"id">>,
                  element(1, proplists:get_value(<<"query">>, Req, []))),
      case QueryId =:= undefined of
        true ->
          lists:member(<<"all">>, WhoCanSeeThisDoc) or
          lists:member(<<"admin">>, WhoCanSeeThisDoc);
        false ->
          Unassigned = proplists:get_value(<<"unassigned">>,
                        element(1, proplists:get_value(<<"query">>, Req, []))),
          case Unassigned =:= <<"true">> of
            true ->
              lists:member(<<"all">>, WhoCanSeeThisDoc) or
              lists:member(<<"unassigned">>, WhoCanSeeThisDoc) or
              lists:member(QueryId, WhoCanSeeThisDoc);
            false ->
              lists:member(<<"all">>, WhoCanSeeThisDoc) or
              lists:member(QueryId, WhoCanSeeThisDoc)
          end
      end;
    false ->
      % normal code
  % Some values are wrapped in a tuple for some arbitrary reason
  %  i.e. {[{...}]} instead of [{...}]
  % Instead of working this out we're just guarding against it
  % TODO work out all the rules for this so we can optimise this function
  %      away for better performance
  SafeGetValue = fun(Key, PropListMaybe, Default) ->
    if
      is_tuple(PropListMaybe) andalso size(PropListMaybe) =:= 1 ->
        proplists:get_value(Key, element(1, PropListMaybe), Default);
      is_list(PropListMaybe) ->
        proplists:get_value(Key, PropListMaybe, Default);
      true ->
        Default
    end
  end,

  DeepGet = fun(DeepGet, KeyList, PropList) ->
    if
      length(KeyList) > 1 andalso PropList =:= [] ->
        undefined;
      length(KeyList) =:= 1 ->
        SafeGetValue(hd(KeyList), PropList, undefined);
      true ->
        DeepGet(DeepGet, tl(KeyList), SafeGetValue(hd(KeyList), PropList, []))
    end
  end,

  FindPlace = fun(FindPlace, Place, QueryId) ->
    if
      Place =:= undefined ->
        false;
      true ->
        case SafeGetValue(<<"_id">>, Place, undefined) =:= QueryId of
          true -> true;
          false -> FindPlace(FindPlace, SafeGetValue(<<"parent">>, Place, undefined), QueryId)
        end
    end
  end,

  Ok = fun(Place) ->
    QueryId = DeepGet(DeepGet, [<<"query">>, <<"id">>], Req),
    case QueryId =:= undefined of
      true -> true; % Admin
      false ->
        case Place =:= undefined of
          % nb: query.unassigned is a string and not a boolean because it comes from
          %     the request not from stored documents
          true -> DeepGet(DeepGet, [<<"query">>, <<"unassigned">>], Req) =:= <<"true">>;
          false -> FindPlace(FindPlace, Place, QueryId)
        end
    end
  end,

  CouchUser = list_to_binary([
      <<"org.couchdb.user:">>,
      DeepGet(DeepGet, [<<"userCtx">>, <<"name">>], Req)]),

  case proplists:get_value(<<"_id">>, Doc) of
    <<"design/medic">> -> false;     % Never replicate the ddoc as it's too big.
                                     % Changes are tracked in the watchDesignDoc function of the DB service.
    <<"resources">> -> true;
    CouchUser -> true;
    _ -> case proplists:get_value(<<"type">>, Doc) of
          <<"data_record">> ->
            KujuaMessage = proplists:get_value(<<"kujua_message">>, Doc),
            if
              KujuaMessage ->
                Tasks = proplists:get_value(<<"tasks">>, Doc, []),
                if
                  length(Tasks) =:= 0 -> Ok(undefined);
                  true ->
                    % Outgoing message
                    Messages = proplists:get_value(<<"messages">>, element(1, hd(Tasks)), []),
                    if
                      length(Messages) =:= 0 -> Ok(undefined);
                      true ->
                        Ok(proplists:get_value(<<"contact">>, element(1, hd(Messages)), undefined))
                    end
                end;
              true ->
                % Incoming message
                Ok(proplists:get_value(<<"contact">>, Doc))
            end;
          <<"form">> -> true;
          <<"clinic">> -> Ok(Doc);
          <<"district_hospital">> -> Ok(Doc);
          <<"health_center">> -> Ok(Doc);
          <<"person">> -> Ok(Doc);
          _ -> false
        end
  end
  end % end of the if
end.
